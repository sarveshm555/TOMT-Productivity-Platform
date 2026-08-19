/**
 * Ported 1:1 from needtoapply.html and ongoing.html - both files defined
 * this exact same function independently. Consolidated here since the
 * business logic is identical: a deadline is "high priority" when it's
 * between now and 2 days from now (inclusive), same as the original.
 */
function isHighPriority(deadlineStr) {
  const deadline = new Date(deadlineStr);
  const now = new Date();
  const diffDays = (deadline - now) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 2;
}

module.exports = { isHighPriority };
