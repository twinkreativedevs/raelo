import "server-only";

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import type { Invoice, InvoiceLineItem } from "@/lib/supabase/database.types";

// Renders an invoice as a single-page A4 PDF. Uses the built-in Helvetica
// fonts, which can't draw "₦", so amounts are written as "NGN 45,000.00".

const RED = rgb(237 / 255, 28 / 255, 36 / 255);
const INK = rgb(17 / 255, 24 / 255, 39 / 255);
const MUTED = rgb(0.42, 0.45, 0.5);
const LINE = rgb(0.9, 0.9, 0.9);

export interface InvoiceBrand {
  siteName: string;
  tagline?: string;
  supportEmail?: string;
  footerText?: string;
}

function money(amount: number, currency: string) {
  return `${currency} ${Number(amount).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function date(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function drawRight(page: PDFPage, text: string, x: number, y: number, font: PDFFont, size: number, color = INK) {
  page.drawText(text, { x: x - font.widthOfTextAtSize(text, size), y, size, font, color });
}

export async function renderInvoicePdf(
  invoice: Invoice & { order_number?: string | null },
  brand: InvoiceBrand,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${brand.siteName} invoice ${invoice.invoice_number}`);
  pdf.setAuthor(brand.siteName);

  const page = pdf.addPage([595.28, 841.89]); // A4
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const left = 50;
  const right = 545;
  let y = 780;

  // Header
  page.drawRectangle({ x: left, y: y - 6, width: 28, height: 28, color: RED });
  page.drawText("R", { x: left + 8, y: y + 1, size: 18, font: bold, color: rgb(1, 1, 1) });
  page.drawText(brand.siteName, { x: left + 38, y: y + 2, size: 20, font: bold, color: RED });
  drawRight(page, "INVOICE", right, y + 2, bold, 20);
  y -= 22;
  if (brand.tagline) {
    page.drawText(brand.tagline, { x: left, y, size: 9, font: regular, color: MUTED });
  }
  drawRight(page, invoice.invoice_number, right, y, regular, 10, MUTED);

  if (invoice.status === "void") {
    page.drawText("VOID", {
      x: 200,
      y: 420,
      size: 110,
      font: bold,
      color: RED,
      opacity: 0.15,
    });
  }

  // Meta
  y -= 50;
  page.drawText("BILLED TO", { x: left, y, size: 8, font: bold, color: MUTED });
  page.drawText("DETAILS", { x: 350, y, size: 8, font: bold, color: MUTED });
  y -= 16;

  const billedTo = [
    invoice.billed_to_name,
    invoice.billed_to_company,
    invoice.billed_to_email,
  ].filter((line): line is string => Boolean(line));

  const details: [string, string][] = [
    ["Issued", date(invoice.issued_at)],
    ["Status", invoice.status === "paid" ? "Paid" : "Void"],
  ];
  if (invoice.order_number) details.push(["Order", invoice.order_number]);

  const rows = Math.max(billedTo.length, details.length);
  for (let i = 0; i < rows; i++) {
    if (billedTo[i]) {
      page.drawText(billedTo[i], { x: left, y, size: 10, font: i === 0 ? bold : regular, color: INK });
    }
    if (details[i]) {
      page.drawText(details[i][0], { x: 350, y, size: 10, font: regular, color: MUTED });
      drawRight(page, details[i][1], right, y, regular, 10);
    }
    y -= 15;
  }

  // Line items
  y -= 25;
  page.drawText("DESCRIPTION", { x: left, y, size: 8, font: bold, color: MUTED });
  drawRight(page, "QTY", 380, y, bold, 8, MUTED);
  drawRight(page, "UNIT", 460, y, bold, 8, MUTED);
  drawRight(page, "AMOUNT", right, y, bold, 8, MUTED);
  y -= 8;
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 1, color: LINE });
  y -= 18;

  for (const item of invoice.line_items as InvoiceLineItem[]) {
    page.drawText(item.description, { x: left, y, size: 10, font: regular, color: INK });
    drawRight(page, String(item.quantity), 380, y, regular, 10);
    drawRight(page, money(item.unit_amount, invoice.currency), 460, y, regular, 10);
    drawRight(page, money(item.amount, invoice.currency), right, y, regular, 10);
    y -= 22;
  }

  page.drawLine({ start: { x: left, y: y + 8 }, end: { x: right, y: y + 8 }, thickness: 1, color: LINE });

  // Totals
  y -= 12;
  const totals: [string, string, boolean][] = [
    ["Subtotal", money(invoice.subtotal, invoice.currency), false],
  ];
  if (Number(invoice.discount_amount) > 0) {
    totals.push(["Discount", `- ${money(invoice.discount_amount, invoice.currency)}`, false]);
  }
  totals.push(["Total paid", money(invoice.total, invoice.currency), true]);

  for (const [label, value, strong] of totals) {
    page.drawText(label, { x: 350, y, size: strong ? 12 : 10, font: strong ? bold : regular, color: strong ? INK : MUTED });
    drawRight(page, value, right, y, strong ? bold : regular, strong ? 12 : 10, strong ? RED : INK);
    y -= strong ? 22 : 16;
  }

  // Footer
  const footer = [brand.footerText, brand.supportEmail].filter(Boolean).join("  ·  ");
  if (footer) {
    page.drawLine({ start: { x: left, y: 70 }, end: { x: right, y: 70 }, thickness: 1, color: LINE });
    page.drawText(footer, { x: left, y: 52, size: 8, font: regular, color: MUTED });
  }

  return pdf.save();
}
