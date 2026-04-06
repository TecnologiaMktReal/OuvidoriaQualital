import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Send } from "lucide-react";

type Props = {
  ticketId: number;
  defaultTo?: string;
};

export function EmailSender({ ticketId, defaultTo }: Props) {
  const [to, setTo] = useState(defaultTo ?? "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [accountId, setAccountId] = useState<number | undefined>(undefined);

  const accountsQuery = trpc.emailSetup.list.useQuery(undefined, { refetchOnWindowFocus: false });
  const sendMutation = trpc.email.sendTicketEmail.useMutation({
    onSuccess: () => {
      toast.success("E-mail enviado");
      setBody("");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSend = () => {
    if (!to || !subject || !body) {
      toast.error("Preencha destinatário, assunto e mensagem");
      return;
    }
    sendMutation.mutate({ ticketId, to, subject, body, accountId });
  };

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="flex items-center gap-2">
        <Send className="h-4 w-4 text-primary" />
        <h4 className="font-semibold text-sm">Enviar por E-mail</h4>
      </div>
      <div className="grid gap-2">
        <Label>Remetente (conta)</Label>
        <Select
          value={accountId ? String(accountId) : accountsQuery.data?.find(a => a.isDefault)?.id?.toString() || ""}
          onValueChange={(v) => setAccountId(v ? Number(v) : undefined)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Conta padrão" />
          </SelectTrigger>
          <SelectContent>
            {accountsQuery.data?.map((acc) => (
              <SelectItem key={acc.id} value={String(acc.id)}>
                {acc.name} {acc.isDefault ? "(padrão)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label>Para</Label>
        <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="destinatario@exemplo.com" />
      </div>
      <div className="grid gap-2">
        <Label>Assunto</Label>
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Assunto do ticket" />
      </div>
      <div className="grid gap-2">
        <Label>Mensagem</Label>
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} />
      </div>
      <Button onClick={handleSend} disabled={sendMutation.isPending}>
        {sendMutation.isPending ? "Enviando..." : "Enviar E-mail"}
      </Button>
    </div>
  );
}





