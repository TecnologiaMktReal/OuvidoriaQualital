import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { sendTicketEmail } from "../email/sender";
import * as db from "../db";

export const emailRouter = router({
  sendTicketEmail: protectedProcedure
    .input(
      z.object({
        ticketId: z.number(),
        to: z.union([z.string().email(), z.array(z.string().email())]),
        subject: z.string().min(1),
        body: z.string().min(1),
        html: z.string().optional(),
        accountId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { ticketId, to, subject, body, html, accountId } = input;
      const result = await sendTicketEmail({
        ticketId,
        to,
        subject,
        text: body,
        html,
        accountId,
      });

      // Registrar no chat do ticket e aplicar transição de status:
      // usuário respondeu -> aguardando_resposta (via db.createTicketMessage)
      try {
        await db.createTicketMessage({
          ticketId,
          senderType: "atendente",
          senderId: ctx.user.id,
          message: body,
          isFromWhatsapp: false,
        });
      } catch {
        // Não falhar o envio de e-mail se o log no chat falhar.
      }

      return result;
    }),
});





