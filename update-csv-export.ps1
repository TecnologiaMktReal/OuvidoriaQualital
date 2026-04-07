$filePath = "client\src\pages\Tickets.tsx"
$content = Get-Content $filePath -Raw -Encoding UTF8

# Replace CSV export handler
$oldCsvPattern = [regex]::Escape('onClick={() => {
                            const headers = ["Protocolo", "Status", "Cooperado", "Contrato", "Motivo", "Telefone", "Data Criação", "Fechamento", "Atendente", "SLA", "CSAT"];
                            const rows = filteredTickets.map(t => [
                              t.protocol,
                              t.statusName || t.status,
                              t.cooperadoName || t.externalName || "Desconhecido",
                              t.contractName || "-",
                              t.reasonName || "-",
                              (t.cooperadoPhonePreferred || t.externalNumber || t.externalIdentifier || "").replace(''@c.us'', ''''),
                              new Date(t.createdAt).toLocaleString("pt-BR"),
                              t.closedAt ? new Date(t.closedAt).toLocaleString("pt-BR") : "-",
                              t.attendantName || "Não atribuído",
                              t.closedAt ? `${Math.floor((new Date(t.closedAt).getTime() - new Date(t.createdAt).getTime()) / 3600000)}h` : "-",
                              t.csatRating ? (t.csatRating === 3 ? "Ótimo" : t.csatRating === 2 ? "Bom" : "Ruim") : "Sem resposta"
                            ]);

                            const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
                            const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
                            const link = document.createElement("a");
                            link.href = URL.createObjectURL(blob);
                            link.download = `tickets_${new Date().toISOString().split(''T'')[0]}.csv`;
                            link.click();
                            toast.success("CSV exportado com sucesso!");
                          }}')

$newCsvHandler = @'
onClick={() => {
                            const { headers, rows } = prepareExportData();
                            const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
                            const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
                            const link = document.createElement("a");
                            link.href = URL.createObjectURL(blob);
                            link.download = `tickets_${new Date().toISOString().split('T')[0]}.csv`;
                            link.click();
                            toast.success("CSV exportado com sucesso!");
                          }}
'@

Write-Host "Searching for CSV export pattern..."
if ($content -match $oldCsvPattern) {
    Write-Host "Pattern found! Replacing..."
    $content = $content -replace $oldCsvPattern, $newCsvHandler
    Set-Content $filePath -Value $content -Encoding UTF8 -NoNewline
    Write-Host "CSV export updated successfully!"
} else {
    Write-Host "Pattern not found. File may have already been updated or pattern doesn't match exactly."
}

