import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb, internalConversations, conversationParticipants, internalMessages } from "../db";
import { eq, and, desc, or, sql, inArray } from "drizzle-orm";
import { users, profiles, departments, userProfileTypes } from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";
import { uploadAvatarToSupabase } from "../_core/supabaseStorage";

export const internalChatRouter = router({
  // Listar usuários agrupados por departamento
  getUsersByDepartment: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    const usersData = await db
      .select({
        userId: users.id,
        userName: users.name,
        userEmail: users.email,
        userRole: users.role,
        fullName: profiles.fullName,
        nickname: profiles.nickname,
        phone: profiles.phone,
        avatarUrl: profiles.avatarUrl,
        departmentId: departments.id,
        departmentName: departments.name,
        departmentManagerId: departments.responsibleUserId,
        positionName: userProfileTypes.name,
      })
      .from(users)
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .leftJoin(departments, eq(profiles.departmentId, departments.id))
      .leftJoin(userProfileTypes, eq(profiles.profileTypeId, userProfileTypes.id))
      .where(eq(profiles.isActive, true))
      .orderBy(departments.name, profiles.fullName);

    // Agrupar por departamento
    const grouped = usersData.reduce((acc, user) => {
      const deptId = user.departmentId || 0;
      const deptName = user.departmentName || "Sem Departamento";
      
      if (!acc[deptId]) {
        acc[deptId] = {
          id: deptId,
          name: deptName,
          users: [],
        };
      }

      acc[deptId].users.push({
        id: user.userId,
        name: user.fullName || user.userName || "Usuário",
        nickname: user.nickname,
        email: user.userEmail,
        role: user.userRole,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        isManager: user.userRole === "gerente" || user.userRole === "SuperAdmin",
        position: user.positionName || "Sem Cargo",
        isDepartmentManager: user.userId === user.departmentManagerId,
      });

      return acc;
    }, {} as Record<number, { id: number; name: string; users: any[] }>);

    return Object.values(grouped);
  }),

  // Listar conversas do usuário
  getConversations: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    const userId = ctx.user.id;

    // Buscar conversas onde o usuário é participante
    const conversations = await db
      .select({
        conversationId: internalConversations.id,
        title: internalConversations.title,
        isGroup: internalConversations.isGroup,
        updatedAt: internalConversations.updatedAt,
        lastReadAt: conversationParticipants.lastReadAt,
      })
      .from(conversationParticipants)
      .innerJoin(internalConversations, eq(conversationParticipants.conversationId, internalConversations.id))
      .where(eq(conversationParticipants.userId, userId))
      .orderBy(desc(internalConversations.updatedAt));

    // Para cada conversa, buscar o outro participante (se não for grupo) e última mensagem
    const conversationsWithDetails = await Promise.all(
      conversations.map(async (conv) => {
        // Buscar participantes
        const participants = await db
          .select({
            userId: users.id,
            userName: users.name,
            fullName: profiles.fullName,
            avatarUrl: profiles.avatarUrl,
          })
          .from(conversationParticipants)
          .innerJoin(users, eq(conversationParticipants.userId, users.id))
          .leftJoin(profiles, eq(profiles.userId, users.id))
          .where(eq(conversationParticipants.conversationId, conv.conversationId));

        // Buscar última mensagem
        const lastMessage = await db
          .select({
            message: internalMessages.message,
            createdAt: internalMessages.createdAt,
            senderId: internalMessages.senderId,
          })
          .from(internalMessages)
          .where(eq(internalMessages.conversationId, conv.conversationId))
          .orderBy(desc(internalMessages.createdAt))
          .limit(1);

        // Contar mensagens não lidas
        const unreadCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(internalMessages)
          .where(
            and(
              eq(internalMessages.conversationId, conv.conversationId),
              conv.lastReadAt
                ? sql`${internalMessages.createdAt} > ${conv.lastReadAt}`
                : sql`1=1`
            )
          );

        // Se não for grupo, pegar o outro participante
        const otherParticipant = !conv.isGroup
          ? participants.find((p) => p.userId !== userId)
          : null;

        return {
          id: conv.conversationId,
          title: conv.title || otherParticipant?.fullName || otherParticipant?.userName || "Conversa",
          isGroup: conv.isGroup,
          avatarUrl: otherParticipant?.avatarUrl,
          lastMessage: lastMessage[0]?.message,
          lastMessageAt: lastMessage[0]?.createdAt,
          unreadCount: unreadCount[0]?.count || 0,
          participants: participants.map((p) => ({
            id: p.userId,
            name: p.fullName || p.userName,
            avatarUrl: p.avatarUrl,
          })),
        };
      })
    );

    return conversationsWithDetails;
  }),

  // Buscar mensagens de uma conversa
  getMessages: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Verificar se o usuário é participante da conversa
      const participant = await db
        .select()
        .from(conversationParticipants)
        .where(
          and(
            eq(conversationParticipants.conversationId, input.conversationId),
            eq(conversationParticipants.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!participant.length) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You are not a participant of this conversation" });
      }

      const messages = await db
        .select({
          id: internalMessages.id,
          message: internalMessages.message,
          fileUrl: internalMessages.fileUrl,
          fileName: internalMessages.fileName,
          fileType: internalMessages.fileType,
          sentToWhatsApp: internalMessages.sentToWhatsApp,
          createdAt: internalMessages.createdAt,
          senderId: internalMessages.senderId,
          senderName: profiles.fullName,
          senderAvatar: profiles.avatarUrl,
        })
        .from(internalMessages)
        .leftJoin(users, eq(internalMessages.senderId, users.id))
        .leftJoin(profiles, eq(profiles.userId, users.id))
        .where(eq(internalMessages.conversationId, input.conversationId))
        .orderBy(internalMessages.createdAt);

      return messages;
    }),

  // Criar ou obter conversa 1-1 vinculada a um ticket (opcional)
  getOrCreateConversation: protectedProcedure
    .input(z.object({ 
      otherUserId: z.number(),
      ticketId: z.number().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const userId = ctx.user.id;

      // Verificar se já existe uma conversa entre os dois usuários (e vinculada ao mesmo ticket se fornecido)
      const existingConversation = await db
        .select({
          conversationId: conversationParticipants.conversationId,
        })
        .from(conversationParticipants)
        .innerJoin(internalConversations, eq(conversationParticipants.conversationId, internalConversations.id))
        .where(
          and(
            eq(conversationParticipants.userId, userId),
            input.ticketId ? eq(internalConversations.ticketId, input.ticketId) : sql`1=1`,
            sql`${conversationParticipants.conversationId} IN (
              SELECT conversationId FROM conversation_participants 
              WHERE userId = ${input.otherUserId}
            )`
          )
        )
        .limit(1);

      if (existingConversation.length > 0) {
        return { conversationId: existingConversation[0].conversationId };
      }

      // Criar nova conversa
      const [conversation] = await db.insert(internalConversations).values({
        isGroup: false,
        ticketId: input.ticketId || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const conversationId = Number(conversation.insertId);

      // Adicionar participantes
      await db.insert(conversationParticipants).values([
        {
          conversationId,
          userId,
          joinedAt: new Date(),
        },
        {
          conversationId,
          userId: input.otherUserId,
          joinedAt: new Date(),
        },
      ]);

      return { conversationId };
    }),

  // Enviar mensagem
  sendMessage: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
        message: z.string().optional(),
        fileUrl: z.string().optional(),
        fileName: z.string().optional(),
        fileType: z.enum(["image", "audio", "document", "video"]).optional(),
        sendToWhatsApp: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Verificar se o usuário é participante e obter ticketId
      const convData = await db
        .select({
          id: internalConversations.id,
          ticketId: internalConversations.ticketId,
        })
        .from(internalConversations)
        .innerJoin(conversationParticipants, eq(conversationParticipants.conversationId, internalConversations.id))
        .where(
          and(
            eq(internalConversations.id, input.conversationId),
            eq(conversationParticipants.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!convData.length) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You are not a participant of this conversation" });
      }

      // Inserir mensagem
      const [result] = await db.insert(internalMessages).values({
        conversationId: input.conversationId,
        senderId: ctx.user.id,
        message: input.message,
        fileUrl: input.fileUrl,
        fileName: input.fileName,
        fileType: input.fileType,
        sentToWhatsApp: input.sendToWhatsApp,
        createdAt: new Date(),
      });

      // Atualizar timestamp da conversa
      await db
        .update(internalConversations)
        .set({ updatedAt: new Date() })
        .where(eq(internalConversations.id, input.conversationId));

      // Se vinculado a um ticket, registrar no histórico
      if (convData[0].ticketId && input.message) {
        const { createTicketHistory } = await import("../db");
        await createTicketHistory({
          ticketId: convData[0].ticketId,
          userId: ctx.user.id,
          action: "internal_message",
          comment: `[INTERNO]: ${input.message.substring(0, 100)}${input.message.length > 100 ? "..." : ""}`,
        });
      }

      return { messageId: Number(result.insertId) };
    }),

  // Buscar mensagens por Ticket ID (consolida mensagens de todas as conversas internas do ticket)
  getMessagesByTicket: protectedProcedure
    .input(z.object({ ticketId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { getInternalMessagesByTicketId } = await import("../db");
      return await getInternalMessagesByTicketId(input.ticketId);
    }),

  // Marcar mensagens como lidas
  markAsRead: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      await db
        .update(conversationParticipants)
        .set({ lastReadAt: new Date() })
        .where(
          and(
            eq(conversationParticipants.conversationId, input.conversationId),
            eq(conversationParticipants.userId, ctx.user.id)
          )
        );

      return { success: true };
    }),

  // Upload de arquivo
  uploadFile: protectedProcedure
    .input(
      z.object({
        base64: z.string(),
        mimeType: z.string(),
        fileName: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const url = await uploadAvatarToSupabase(input.base64, input.mimeType);
        
        if (!url) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to upload file" });
        }

        return { url };
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to upload file" });
      }
    }),
});



