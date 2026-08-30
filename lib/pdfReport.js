import jsPDF from 'jspdf';

export function generateSoilReport({ inputs, result, photoDataUrl }) {
  const doc = new jsPDF();
  let y = 20;

  doc.setFontSize(18);
  doc.text('Soil Health Report', 20, y);
  y += 12;

  doc.setFontSize(11);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 20, y);
  y += 10;

  if (photoDataUrl) {
    try {
      doc.addImage(photoDataUrl, 'JPEG', 20, y, 50, 50);
      y += 55;
    } catch (e) {
      // photo add fail hone par bhi report continue banti rahe
    }
  }

  doc.setFontSize(14);
  doc.text('Soil Test Input', 20, y);
  y += 8;
  doc.setFontSize(11);
  doc.text(`Nitrogen (N): ${inputs.n} kg/ha`, 20, y); y += 6;
  doc.text(`Phosphorus (P): ${inputs.p} kg/ha`, 20, y); y += 6;
  doc.text(`Potassium (K): ${inputs.k} kg/ha`, 20, y); y += 6;
  doc.text(`Soil pH: ${inputs.ph}`, 20, y); y += 10;

  doc.setFontSize(14);
  doc.text(`Soil Health Score: ${result.score}/100 (${result.overall})`, 20, y);
  y += 10;

  doc.setFontSize(14);
  doc.text('Deficiency Diagnosis', 20, y);
  y += 8;
  doc.setFontSize(11);
  if (result.deficiencies.length === 0) {
    doc.text('No significant deficiencies detected.', 20, y);
    y += 6;
  } else {
    result.deficiencies.forEach((d) => {
      doc.text(`- ${d.nutrient}: ${d.status}`, 20, y);
      y += 6;
    });
  }
  y += 6;

  doc.setFontSize(14);
  doc.text('Recommended Crops', 20, y);
  y += 8;
  doc.setFontSize(11);
  doc.text(result.recommendedCrops.join(', '), 20, y);

  doc.save('soil-health-report.pdf');
}
