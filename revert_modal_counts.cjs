const fs = require('fs');
let content = fs.readFileSync('frontend/src/components/DocumentManagerModal.jsx', 'utf8');

const newComputeStart = "// Compute Summary";
const newComputeEnd = "const overallStatus = allMandatoryComplete ? 'Completed' : 'Pending';";

const newComputeCode = content.substring(
    content.indexOf(newComputeStart), 
    content.indexOf(newComputeEnd) + newComputeEnd.length
);

const oldComputeCode = `// Compute Summary
  const reqTypes = getRequiredTypes();
  const legalReqTypes = reqTypes.filter(rt => rt.category === 'Legal Documents');
  
  const mandatoryCount = legalReqTypes.filter(rt => rt.mandatory || (rt.type === 'Signage Approval' && !documents.find(d => d.type === 'Signage Approval' && d.disabled))).length;
  
  let uploadedMandatoryCount = 0;
  let allMandatoryComplete = true;

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
    
    if (isComplete && rt.mandatory && rt.category === 'Legal Documents') {
      uploadedMandatoryCount++;
    } else if (!isComplete && rt.mandatory) {
      allMandatoryComplete = false;
    } else if (!isComplete && rt.type === 'Signage Approval' && !doc?.disabled) {
      // If signage is enabled (default) and not uploaded, it's missing
      allMandatoryComplete = false;
    }
  });

  const overallStatus = allMandatoryComplete ? 'Completed' : 'Pending';`;

content = content.replace(newComputeCode, oldComputeCode);

content = content.replace(
    "<Typography variant=\"caption\" color=\"text.secondary\" fontWeight={700}>Mandatory Documents</Typography>",
    "<Typography variant=\"caption\" color=\"text.secondary\" fontWeight={700}>Agreement Signed</Typography>"
);

fs.writeFileSync('frontend/src/components/DocumentManagerModal.jsx', content);
console.log("Reverted counts successfully.");
