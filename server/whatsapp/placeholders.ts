export interface PlaceholderContext {
  ticket: {
    id: number;
    protocol: string;
    externalName?: string | null;
  };
  cliente?: {
    name?: string | null;
  } | null;
  attendantName?: string;
  departmentName?: string;
  contractName?: string;
}

/**
 * Substitui placeholders em uma mensagem por valores reais.
 * 
 * Placeholders suportados:
 * - {{protocol}}: Protocolo do ticket
 * - {{id}}: ID do ticket
 * - {{name}}: Nome do Cliente (ou nome externo do contato)
 * - {{attendant}}: Nome do atendente (ou "Atendente Virtual")
 * - {{date}}: Data atual (dd/mm/aaaa)
 * - {{time}}: Hora atual (HH:MM)
 * - {{department}}: Nome do departamento
 * - {{contract}}: Nome do contrato
 */
export function replaceMessagePlaceholders(message: string, context: PlaceholderContext): string {
  let processed = message;

  // Ticket Info
  processed = processed.replace(/{{protocol}}/g, context.ticket.protocol);
  processed = processed.replace(/{{id}}/g, String(context.ticket.id));

  // Cliente Name
  const displayName = (context.cliente && context.cliente.name && !context.cliente.name.startsWith("WhatsApp ")) 
    ? context.cliente.name 
    : (context.ticket.externalName || "");
  processed = processed.replace(/{{name}}/g, displayName);

  // Attendant (First Name Only)
  const attendantFull = context.attendantName || "Atendente Virtual";
  const attendant = attendantFull.split(" ")[0];
  processed = processed.replace(/{{attendant}}/g, attendant);

  // Date & Time
  const now = new Date();
  const dateStr = now.toLocaleDateString("pt-BR");
  const timeStr = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  processed = processed.replace(/{{date}}/g, dateStr);
  processed = processed.replace(/{{time}}/g, timeStr);

  // Department & Contract
  processed = processed.replace(/{{department}}/g, context.departmentName || "");
  processed = processed.replace(/{{contract}}/g, context.contractName || "");

  return processed;
}



