import jsPDF from 'jspdf';

export function generateSoilReport({ inputs, result, photoDataUrl }) {
  const doc = new jsPDF();
  let y = 20;

  function checkPageBreak(requiredSpace = 20) {
    if (y + requiredSpace > 280) {
      doc.addPage();
      y = 20;
    }
  }

  // Header Title
  doc.setFontSize(20);
  doc.setTextColor(22, 101, 52); // Forest Green
  doc.text('Soil Health Advisory Report', 20, y);
  y += 9;

  doc.setFontSize(10);
  doc.setTextColor(75, 85, 99);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 20, y);
  y += 8;

  // Soil Photo if available
  if (photoDataUrl) {
    try {
      doc.addImage(photoDataUrl, 'JPEG', 20, y, 45, 45);
      y += 50;
    } catch {
      // Photo error fallback
    }
  }

  // 1. Soil Test Inputs
  checkPageBreak(35);
  doc.setFontSize(13);
  doc.setTextColor(17, 24, 39);
  doc.text('1. Soil Test Parameters (NPK & pH)', 20, y);
  y += 7;

  doc.setFontSize(10);
  doc.setTextColor(55, 65, 81);
  doc.text(`- Nitrogen (N): ${inputs.n} kg/ha (Optimal: 280 - 560 kg/ha)`, 20, y); y += 6;
  doc.text(`- Phosphorus (P): ${inputs.p} kg/ha (Optimal: 10 - 25 kg/ha)`, 20, y); y += 6;
  doc.text(`- Potassium (K): ${inputs.k} kg/ha (Optimal: 120 - 280 kg/ha)`, 20, y); y += 6;
  doc.text(`- Soil pH: ${inputs.ph} (Optimal: 6.0 - 7.5)`, 20, y); y += 9;

  // 2. Soil Health Score & Classification
  checkPageBreak(30);
  doc.setFontSize(13);
  doc.setTextColor(17, 24, 39);
  doc.text('2. Soil Health Diagnosis', 20, y);
  y += 7;

  doc.setFontSize(10);
  doc.setTextColor(55, 65, 81);
  const grade = result.soilClassification?.healthGrade ? ` | Grade: ${result.soilClassification.healthGrade}` : '';
  doc.text(`- Health Score: ${result.score}/100 (${result.overall.toUpperCase()}${grade})`, 20, y); y += 6;

  if (result.soilClassification) {
    doc.text(`- pH Reaction: ${result.soilClassification.phCategory}`, 20, y); y += 6;
    doc.text(`- Primary Limiting Factor: ${result.soilClassification.limitingFactor}`, 20, y); y += 6;
  }
  y += 3;

  // 3. Deficiencies & Strengths
  checkPageBreak(40);
  doc.setFontSize(13);
  doc.setTextColor(17, 24, 39);
  doc.text('3. Nutrient Observations', 20, y);
  y += 7;

  doc.setFontSize(10);
  if (result.deficiencies.length === 0) {
    doc.setTextColor(22, 101, 52);
    doc.text('✓ No significant deficiencies detected across tested parameters.', 20, y);
    y += 6;
  } else {
    doc.setTextColor(185, 28, 28);
    result.deficiencies.forEach((d) => {
      doc.text(`• Deficiency: ${d.nutrient} (${d.status.toUpperCase()})`, 20, y);
      y += 6;
    });
  }

  if (result.strengths && result.strengths.length > 0) {
    doc.setTextColor(22, 101, 52);
    result.strengths.forEach((s) => {
      doc.text(`✓ Strength: ${s.text}`, 20, y);
      y += 6;
    });
  }
  y += 4;

  // 4. Crop Recommendations
  checkPageBreak(35);
  doc.setFontSize(13);
  doc.setTextColor(17, 24, 39);
  doc.text('4. Recommended Crops & Seasonality', 20, y);
  y += 7;

  doc.setFontSize(10);
  doc.setTextColor(55, 65, 81);
  if (result.cropRecommendations && result.cropRecommendations.length > 0) {
    result.cropRecommendations.forEach((cr) => {
      checkPageBreak(12);
      doc.text(`• ${cr.name} (${cr.suitability}% suitability estimate) - ${cr.reasons.join(', ')}`, 20, y);
      y += 6;
    });
  } else {
    doc.text(result.recommendedCrops.join(', '), 20, y);
    y += 6;
  }

  if (result.seasonalCrops) {
    y += 2;
    doc.setFontSize(9);
    doc.setTextColor(75, 85, 99);
    doc.text(`Seasonal options - Kharif: ${result.seasonalCrops.kharif.join(', ')} | Rabi: ${result.seasonalCrops.rabi.join(', ')} | Zaid: ${result.seasonalCrops.zaid.join(', ')}`, 20, y);
    y += 6;
  }
  y += 4;

  // 5. Safe Farmer Action Plan
  if (result.actionPlan && result.actionPlan.length > 0) {
    checkPageBreak(40);
    doc.setFontSize(13);
    doc.setTextColor(17, 24, 39);
    doc.text('5. Recommended Farm Actions', 20, y);
    y += 7;

    doc.setFontSize(10);
    doc.setTextColor(55, 65, 81);
    result.actionPlan.slice(0, 3).forEach((act) => {
      checkPageBreak(14);
      doc.text(`• [${act.priority.toUpperCase()}] ${act.recommendation}`, 20, y);
      y += 6;
    });
    y += 2;
  }

  // Advisory Disclaimer
  checkPageBreak(20);
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text('Important Notice: Recommendations are rule-based agronomic guidelines.', 20, y); y += 4;
  doc.text('Always confirm exact fertilizer doses and crop varieties with your local agricultural officer.', 20, y);

  doc.save('soil-health-report.pdf');
}
