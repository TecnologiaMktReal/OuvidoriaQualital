# Update Tickets.tsx export handlers
$filePath = "client\src\pages\Tickets.tsx"
$content = Get-Content $filePath -Raw -Encoding UTF8

# Update CSV export (first occurrence around line 1217)
$content = $content -replace `
  '(?s)onClick\(\(\) => \{\s+const headers = \["Protocolo", "Status", "Cooperado", "Contrato", "Motivo", "Telefone", "Data Criação", "Fechamento", "Atendente", "SLA", "CSAT"\];\s+const rows = filteredTickets\.map\(t => \[\s+t\.protocol,\s+t\.statusName \|\| t\.status,\s+t\.cooperadoName \|\| t\.externalName \|\| "Desconhecido",\s+t\.contractName \|\| "-",\s+t\.reasonName \|\| "-",\s+\(t\.cooperadoPhonePreferred \|\| t\.externalNumber \|\| t\.externalIdentifier \|\| ""\)\.replace\(''@c\.us'', ''''\),\s+new Date\(t\.createdAt\)\.toLocaleString\("pt-BR"\),\s+t\.closedAt \? new Date\(t\.closedAt\)\.toLocaleString\("pt-BR"\) : "-",\s+t\.attendantName \|\| "Não atribuído",\s+t\.closedAt \? `\$\{Math\.floor\(\(new Date\(t\.closedAt\)\.getTime\(\) - new Date\(t\.createdAt\)\.getTime\(\)\) / 3600000\)\}h` : "-",\s+t\.csatRating \? \(t\.csatRating === 3 \? "Ótimo" : t\.csatRating === 2 \? "Bom" : "Ruim"\) : "Sem resposta"\s+\]\);\s+const csvContent', `
  'onClick={() => {
                            const { headers, rows } = prepareExportData();
                            const csvContent'

# Update XLS export (second occurrence around line 1249)  
$content = $content -replace `
  '(?s)// Simple XLS format \(HTML table\)\s+const xlsContent = `\s+<html xmlns:x="urn:schemas-microsoft-com:office:excel">\s+<head><meta charset="UTF-8"></head>\s+<body>\s+<table border="1">\s+<tr>\$\{headers\.map\(h => `<th>\$\{h\}</th>`\)\.join\(''''\)\}</tr>\s+\$\{rows\.map\(row => `<tr>\$\{row\.map\(cell => `<td>\$\{cell\}</td>`\)\.join\(''''\)\}</tr>`\)\.join\(''''\)\}\s+</table>\s+</body>\s+</html>', `
  '// Enhanced XLS format with proper cell types
                            const { headers, rows } = prepareExportData();
                            const xlsContent = `
                              <html xmlns:x="urn:schemas-microsoft-com:office:excel">
                                <head>
                                  <meta charset="UTF-8">
                                  <xml>
                                    <x:ExcelWorkbook>
                                      <x:ExcelWorksheets>
                                        <x:ExcelWorksheet>
                                          <x:Name>Tickets</x:Name>
                                          <x:WorksheetOptions>
                                            <x:DisplayGridlines/>
                                          </x:WorksheetOptions>
                                        </x:ExcelWorksheet>
                                      </x:ExcelWorksheets>
                                    </x:ExcelWorkbook>
                                  </xml>
                                </head>
                                <body>
                                  <table border="1">
                                    <tr>${headers.map(h => `<th style="background-color: #4F46E5; color: white; font-weight: bold;">${h}</th>`).join('''')}< /tr>
                                    ${rows.map(row => `<tr>${row.map((cell, idx) => {
                                      if ((idx === 5 || idx === 10) && cell !== "-") {
                                        return `<td style="mso-number-format:''0'';">${cell}</td>`;
                                      }
                                      return `<td>${cell}</td>`;
                                    }).join('''')}< /tr>`).join('''')}
                                  </table>
                                </body>
                              </html>'

Set-Content $filePath -Value $content -Encoding UTF8 -NoNewline
Write-Host "Export handlers updated successfully!"

