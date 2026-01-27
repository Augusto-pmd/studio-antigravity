
export default function PrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <title>Recibos de Pago</title>
        <style>
          {`
            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                background-color: #fff !important;
              }
              .no-print {
                display: none !important;
              }
              .break-inside-avoid {
                break-inside: avoid;
                page-break-inside: avoid;
              }
            }
          `}
        </style>
      </head>
      <body className="bg-gray-100 print:bg-white">{children}</body>
    </html>
  );
}
