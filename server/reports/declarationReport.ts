import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as fs from "fs";
import * as path from "path";

export interface DeclarationData {
  nome: string;
  cpf: string;
  cargo: string;
  dataAdmissao: Date | string | null;
  dataAssociacao: Date | string | null;
  dataDesligamento?: Date | string | null;
  status: string;
  municipio: string;
  uf: string;
}

const getHeaderBase64 = () => {
  try {
    const headerPath = path.join(process.cwd(), "client/public/cabecalho-timbrado.png");
    if (fs.existsSync(headerPath)) {
      return fs.readFileSync(headerPath, { encoding: "base64" });
    }
  } catch (error) {
    console.error("Error reading header image for declaration:", error);
  }
  return "";
};

const getFooterBase64 = () => {
  try {
    const footerPath = path.join(process.cwd(), "client/public/rodape-timbrado.png");
    if (fs.existsSync(footerPath)) {
      return fs.readFileSync(footerPath, { encoding: "base64" });
    }
  } catch (error) {
    console.error("Error reading footer image for declaration:", error);
  }
  return "";
};

const getSignatureBase64 = () => {
  try {
    const sigPath = path.join(process.cwd(), "client/public/assinatura-completa.png");
    if (fs.existsSync(sigPath)) {
      return fs.readFileSync(sigPath, { encoding: "base64" });
    }
  } catch (error) {
    console.error("Error reading signature for declaration:", error);
  }
  return "";
};

export function generateDeclarationHtml(data: DeclarationData): string {
  const { nome, cpf, cargo, dataAdmissao, dataAssociacao, dataDesligamento, status, municipio, uf } = data;
  const isTerminated = status.toLowerCase() === 'desligado';

  const dataDoc = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  
  const fmtDate = (d: any) => d ? format(new Date(d), "dd/MM/yyyy") : "___/___/_____";
  const fmtDateLong = (d: any) => d ? format(new Date(d), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "___ de ___________ de _____";
  
  const dataAdmissFmt = fmtDate(dataAdmissao);
  const dataAssocFmt = fmtDate(dataAssociacao);
  const dataAssocExtenso = fmtDateLong(dataAssociacao);
  const dataDesligFmt = fmtDate(dataDesligamento);

  const headerBase64 = getHeaderBase64();
  const footerBase64 = getFooterBase64();
  const sigBase64 = getSignatureBase64();

  const content = isTerminated 
    ? `Declaro, para os fins que se fizerem necessário que, <strong>${nome}</strong>, portador(a) do CPF nº <strong>${cpf}</strong>, foi Cliente(a) desta cooperativa exercendo a função de <strong>${cargo}</strong>, tendo sido admitido(a) em <strong>${dataAdmissFmt}</strong>, associado(a) em <strong>${dataAssocFmt}</strong> e desligado(a) em <strong>${dataDesligFmt}</strong>.`
    : `Declaro, para os fins que se fizerem necessário que, <strong>${nome}</strong>, portador(a) do CPF nº <strong>${cpf}</strong>, é sócio(a) Cliente(a) e exerce a função de <strong>${cargo}</strong>, desde <strong>${dataAssocExtenso}</strong> na Qualital junto ao município de ${municipio}/${uf}.`;

  return `
    <!DOCTYPE html>
    <html lang="pt-br">
    <head>
      <meta charset="UTF-8">
      <style>
        @page {
          margin: 0;
        }
        body {
          font-family: 'Helvetica', 'Arial', sans-serif;
          margin: 0;
          padding: 0;
          color: #1a1a1a;
          line-height: 1.5;
          background: white;
          -webkit-print-color-adjust: exact;
        }
        /* Header image covers the top green bar and logo/text */
        .header-container {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          width: 100%;
          z-index: 100;
        }
        .header-img {
          width: 100%;
          display: block;
        }

        .page-container {
          padding: 70mm 25mm 60mm 25mm; /* Increased both to be safe */
          min-height: 100vh;
          box-sizing: border-box;
          z-index: 5;
        }

        .title {
          font-size: 18pt;
          font-weight: bold;
          text-align: center;
          margin-bottom: 15mm;
          margin-top: 0; /* Let padding handle it */
          text-transform: uppercase;
        }

        .content {
          font-size: 12pt;
          text-align: justify;
          margin-bottom: 20mm;
          line-height: 1.8;
          text-indent: 15mm;
        }

        .date-area {
          text-align: left;
          font-size: 12pt;
          margin-bottom: 20mm;
          margin-top: 10mm;
        }

        .signature-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          margin-top: 5mm;
        }
        .signature-img {
          width: 60mm; /* Decreased by 20% (from 75mm) */
          height: auto;
          margin-bottom: 0px;
        }

        .footer-container {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          width: 100%;
          z-index: 100;
        }
        .footer-img {
          width: 100%;
          display: block;
        }
      </style>
    </head>
    <body>
      <div class="header-container">
        ${headerBase64 ? `<img src="data:image/png;base64,${headerBase64}" class="header-img" />` : ''}
      </div>

      <div class="page-container">
        <div class="title">DECLARAÇÃO</div>

        <div class="content">
          ${content}
          <br><br>
          Sem mais para o momento, e por expressão da verdade, confirmo as informações presentes.
        </div>

        <div class="date-area">
          Monte Alegre/RN, ${dataDoc}.
        </div>

        <div class="signature-section">
          ${sigBase64 ? `<img src="data:image/png;base64,${sigBase64}" class="signature-img" />` : ''}
        </div>
      </div>

      <div class="footer-container">
        ${footerBase64 ? `<img src="data:image/png;base64,${footerBase64}" class="footer-img" />` : ''}
      </div>
    </body>
    </html>
  `;
}



