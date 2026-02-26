const DISCLAIMER =
  'This is educational and not medical diagnosis or treatment. For clinical decisions, consult a qualified healthcare professional.';

export function DisclaimerBanner() {
  return (
    <div className="disclaimer-banner">
      <strong>Disclaimer:</strong> {DISCLAIMER}
    </div>
  );
}
