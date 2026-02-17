import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from "fs";
import path from "path";

interface CertificateData {
  certificate: {
    id: string;
    student_name: string;
    course_name: string;
    completion_date: string;
    verification_code: string;
  };
  template: {
    template_image_path: string;
    canvas_width?: number;
    canvas_height?: number;
  };
  fields: Array<{
    field_type: string;
    position_x: number; // pixels relative to displayed image top-left
    position_y: number; // pixels relative to displayed image top-left
    font_size: number; // pixels at display scale
    font_color: string;
    font_family: string;
    is_bold: boolean;
    is_italic: boolean;
    text_align: string;
  }>;
}

function hexToRgb(hex: string) {
  const cleanHex = hex.replace("#", "");
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  return rgb(r, g, b);
}

function getFieldValue(
  fieldType: string,
  data: CertificateData["certificate"],
): string {
  const shortCode = data.verification_code;
  const shortId = data.id.split("-")[0].toUpperCase();

  switch (fieldType) {
    case "student_name":
      return data.student_name || "";
    case "course_name":
      return data.course_name || "";
    case "completion_date":
      if (!data.completion_date) return "";
      return new Date(data.completion_date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    case "certificate_id":
      return `CERT-${shortId}`;
    case "verification_link":
      return `sarvarth.com/verify/${shortCode}`;
    default:
      return fieldType;
  }
}

export async function generateCertificatePdf(
  data: CertificateData,
): Promise<string> {
  const { certificate, template, fields } = data;

  console.log(`\n[PDF] ===== Starting PDF Generation =====`);
  console.log(`[PDF] Certificate ID: ${certificate.id}`);
  console.log(`[PDF] Student: ${certificate.student_name}`);
  console.log(`[PDF] Course: ${certificate.course_name}`);
  console.log(`[PDF] Verification Code: ${certificate.verification_code}`);
  console.log(`[PDF] Template Image: ${template.template_image_path}`);
  console.log(
    `[PDF] Saved canvas (display) size: ${template.canvas_width}x${template.canvas_height}`,
  );
  console.log(`[PDF] Fields count: ${fields.length}`);

  if (fields.length === 0) {
    console.warn(
      "[PDF] ⚠️ WARNING: No fields found! The PDF will only have the background image.",
    );
  }

  // Load template image
  const templateImagePath = path.join(
    __dirname,
    "..",
    "..",
    template.template_image_path.replace(/^\//, ""),
  );

  console.log(`[PDF] Resolved template path: ${templateImagePath}`);

  if (!fs.existsSync(templateImagePath)) {
    console.error(`[PDF] ❌ Template image NOT FOUND: ${templateImagePath}`);
    throw new Error(`Template image not found: ${templateImagePath}`);
  }

  const imageBytes = fs.readFileSync(templateImagePath);
  const ext = path.extname(templateImagePath).toLowerCase();

  // Create PDF document
  const pdfDoc = await PDFDocument.create();

  // Embed template image
  let image;
  if (ext === ".png") {
    image = await pdfDoc.embedPng(imageBytes);
  } else {
    image = await pdfDoc.embedJpg(imageBytes);
  }

  // The image's natural resolution becomes the PDF page size
  const pdfWidth = image.width;
  const pdfHeight = image.height;

  // Add page with same dimensions as template image
  const page = pdfDoc.addPage([pdfWidth, pdfHeight]);

  // Draw template image as full background
  page.drawImage(image, {
    x: 0,
    y: 0,
    width: pdfWidth,
    height: pdfHeight,
  });

  // Embed all fonts we might need
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const courier = await pdfDoc.embedFont(StandardFonts.Courier);
  const courierBold = await pdfDoc.embedFont(StandardFonts.CourierBold);

  const fontMap: Record<
    string,
    { regular: typeof helvetica; bold: typeof helveticaBold }
  > = {
    Helvetica: { regular: helvetica, bold: helveticaBold },
    "Times-Roman": { regular: timesRoman, bold: timesRomanBold },
    TimesRoman: { regular: timesRoman, bold: timesRomanBold },
    Courier: { regular: courier, bold: courierBold },
  };

  // ────────────────────────────────────────────────
  // COORDINATE SYSTEM EXPLANATION:
  //
  // In the Template Designer (frontend):
  //   - The image is displayed at a reduced size (e.g., 650px wide)
  //   - Fields are positioned using CSS left/top pixels relative to the displayed image
  //   - position_x and position_y are these CSS pixel values
  //   - canvas_width and canvas_height are the displayed image dimensions
  //
  // In the PDF:
  //   - The page size equals the image's natural resolution (e.g., 1600x1200)
  //   - Origin is at bottom-left (y increases upward)
  //
  // To convert:
  //   scaleX = pdfWidth / canvas_width
  //   scaleY = pdfHeight / canvas_height
  //   pdfX = position_x * scaleX
  //   pdfY = pdfHeight - (position_y * scaleY) - (fontSize * scaleX)
  // ────────────────────────────────────────────────

  const canvasWidth =
    template.canvas_width && template.canvas_width > 0
      ? template.canvas_width
      : pdfWidth;
  const canvasHeight =
    template.canvas_height && template.canvas_height > 0
      ? template.canvas_height
      : pdfHeight;

  const scaleX = pdfWidth / canvasWidth;
  const scaleY = pdfHeight / canvasHeight;

  console.log(`[PDF] PDF size: ${pdfWidth}x${pdfHeight}`);
  console.log(`[PDF] Canvas (display) size: ${canvasWidth}x${canvasHeight}`);
  console.log(
    `[PDF] Scale factors: scaleX=${scaleX.toFixed(3)}, scaleY=${scaleY.toFixed(3)}`,
  );

  // Draw each field onto the PDF
  for (const field of fields) {
    const text = getFieldValue(field.field_type, certificate);

    if (!text) {
      console.warn(`[PDF] ⚠️ Skipping empty field: "${field.field_type}"`);
      continue;
    }

    const color = hexToRgb(field.font_color || "#000000");
    const fontSize = field.font_size || 16;

    const fontEntry = fontMap[field.font_family] || fontMap["Helvetica"];
    const font = field.is_bold ? fontEntry.bold : fontEntry.regular;

    // Scale positions from display pixels to PDF pixels
    const pdfX = field.position_x * scaleX;
    const topDownY = field.position_y * scaleY;
    const scaledFontSize = Math.round(fontSize * scaleX);

    // Flip Y: CSS has origin at top-left, PDF has origin at bottom-left
    const pdfY = pdfHeight - topDownY - scaledFontSize;

    console.log(`[PDF] ✅ "${text}"`);
    console.log(
      `[PDF]    display: (${field.position_x.toFixed(1)}, ${field.position_y.toFixed(1)}) fontSize=${fontSize}`,
    );
    console.log(
      `[PDF]    pdf:     (${pdfX.toFixed(1)}, ${pdfY.toFixed(1)}) scaledSize=${scaledFontSize}`,
    );

    // Safety check: skip fields that would be off-page
    if (pdfX < 0 || pdfX > pdfWidth || pdfY < -50 || pdfY > pdfHeight + 50) {
      console.error(
        `[PDF] ❌ SKIPPING "${text}" — off-page at pdf(${pdfX.toFixed(0)}, ${pdfY.toFixed(0)})`,
      );
      continue;
    }

    page.drawText(text, {
      x: pdfX,
      y: pdfY,
      size: scaledFontSize,
      font,
      color,
    });
  }

  // Save PDF to disk
  const pdfBytes = await pdfDoc.save();
  const pdfFilename = `cert_${certificate.id}.pdf`;
  const pdfDir = path.join(__dirname, "..", "..", "generated");
  const pdfFullPath = path.join(pdfDir, pdfFilename);

  if (!fs.existsSync(pdfDir)) {
    fs.mkdirSync(pdfDir, { recursive: true });
  }

  fs.writeFileSync(pdfFullPath, pdfBytes);
  console.log(`[PDF] ✅ PDF saved: ${pdfFullPath}`);
  console.log(`[PDF] ===== PDF Generation Complete =====\n`);

  return `/generated/${pdfFilename}`;
}
