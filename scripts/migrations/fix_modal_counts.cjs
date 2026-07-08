const fs = require('fs');
let content = fs.readFileSync('frontend/src/components/DocumentManagerModal.jsx', 'utf8');

const oldComputeStart = "// Compute Summary";
const oldComputeEnd = "const overallStatus = allMandatoryComplete ? 'Completed' : 'Pending';";

const oldComputeCode = content.substring(
    content.indexOf(oldComputeStart), 
    content.indexOf(oldComputeEnd) + oldComputeEnd.length
);

const newComputeCode = `// Compute Summary
  const reqTypes = getRequiredTypes();
  
  // Filter requirements based on the active category (or all if none)
  const categoryReqTypes = activeCategory 
    ? reqTypes.filter(rt => rt.category === activeCategory)
    : reqTypes;
  
  const mandatoryCount = categoryReqTypes.filter(rt => 
    rt.mandatory || (rt.type === 'Signage Approval' && !documents.find(d => d.type === 'Signage Approval' && d.disabled))
  ).length;
  
  let uploadedMandatoryCount = 0;
  let allMandatoryComplete = true;

  // We should evaluate completeness across ALL required documents for overallStatus
  // but uploadedMandatoryCount should just be for the active category.
  
  reqTypes.forEach(rt => {
    const doc = documents.find(d => d.type === rt.type);
    let isComplete = false;
    if (rt.type === 'Signage Approval' && doc?.disabled) {
       isComplete = true;
    } else if (doc && doc.url) {
       isComplete = true;
       if (rt.requiresDates) {
          if (!doc.metadata?.issuedOn || !doc.metadata?.validUntil) {
             isComplete = false;
          }
       }
    }
    
    // Track count for the active category display
    if (isComplete && rt.mandatory && (!activeCategory || rt.category === activeCategory)) {
      uploadedMandatoryCount++;
    } 
    
    // Track overall completion for the entire store
    if (!isComplete && rt.mandatory) {
      allMandatoryComplete = false;
    } else if (!isComplete && rt.type === 'Signage Approval' && !doc?.disabled) {
      allMandatoryComplete = false;
    }
  });

  const overallStatus = allMandatoryComplete ? 'Completed' : 'Pending';`;

content = content.replace(oldComputeCode, newComputeCode);

// Also change the hardcoded label "Agreement Signed" to "Mandatory Documents"
content = content.replace(
    "<Typography variant=\"caption\" color=\"text.secondary\" fontWeight={700}>Agreement Signed</Typography>",
    "<Typography variant=\"caption\" color=\"text.secondary\" fontWeight={700}>Mandatory Documents</Typography>"
);

fs.writeFileSync('frontend/src/components/DocumentManagerModal.jsx', content);
console.log("Updated counts successfully.");
