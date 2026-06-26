import { firebaseAdmin } from '../lib/firebase-admin';

const ACTIVE_STORE_CODES = new Set([
  "CA-217", "CA-193", "CA-084", "CA-213", "CA-127", "CA-130", "CA-147", "CA-132", "CA-148", "CA-082",
  "CA-053", "CA-037", "CA-096", "CA-061", "CA-116", "CA-140", "CA-008", "CA-238", "CA-282", "CA-017",
  "CA-011", "CA-250", "CA-107", "CA-162", "CA-119", "CA-182", "CA-267", "CA-099", "CA-125", "CA-101",
  "CA-146", "CA-104", "CA-230", "CAGT-157", "GOT-004", "CA-102", "CA-115", "CA-145", "CA-083", "CA-085",
  "CA-038", "CA-190", "CA-004", "CA-166", "CA-165", "CA-179", "CA-234", "CA-062", "CA-094", "CA-032",
  "CA-185", "CA-035", "CA-033", "CA-164", "CA-183", "CA-056", "CA-187", "CA-128", "CA-134", "CA-057",
  "CA-122", "CA-195", "CA-109", "CA-098", "CA-135", "CA-091", "CA-220", "CA-026", "CA-232", "CA-201",
  "CA-199", "CA-177", "CA-058", "CA-016", "CA-216", "CA-097", "CA-087", "CA-161", "CA-186", "CA-244",
  "CA-129", "CA-254", "CA-218", "CA-010", "CA-136", "CA-163", "CA-006", "CA-269", "CA-012", "CA-030",
  "CA-089", "CA-086", "CA-142", "CA-121", "CA-221", "CA-151", "CA-289", "CA-159", "CA-237", "CA-194",
  "CA-106", "CA-117", "CA-189", "CA-024", "CA-100", "CAGT-158", "CA-215", "CA-246", "CA-014", "CA-256",
  "CA-202", "CA-175", "CA-131", "CA-272", "CA-105", "CA-055", "CA-196", "CA-088", "CA-154", "CA-255",
  "CA-229", "CA-222", "CA-141", "CA-191", "CA-273", "CA-276", "CA-284", "CA-266", "CAGT-208", "CA-112",
  "CA-251", "CA-240", "CA-139", "CA-133", "CA-173", "CA-041", "CA-210", "CAGT-252", "CA-150", "CA-093",
  "CA-207", "CA-249", "CA-003", "CAGT-242", "CA-236", "CAGT-241", "CA-178", "CA-005", "CA-114", "CA-018",
  "CA-007", "CA-156", "CA-172", "CA-270", "CA-219", "CA-103", "CA-197", "CA-192", "CA-188", "CAGT-253",
  "CA-283", "CA-285", "CA-288", "CA-113", "CAGT-245", "GOT-003", "CAGT-169", "CAGT-233", "CA-124", "CA-281",
  "CA-118", "CA-310", "CA-228", "CA-287", "CA-291", "CA-294", "CA-309", "CA-292", "CA-297", "CA-295",
  "CA-290", "CA-203", "CA-304", "CA-298", "CA-322", "CA-321", "CA-303", "CA-315", "CA-318", "GOT-001",
  "CAGT-155", "CAGT-184", "CAGT-160", "CA-302", "CAGT-282", "CAGT-268", "CAGT-280", "CA-052", "CA-044",
  "CA-110", "CA-060", "CA-144", "CA-181", "CA-264", "CA-143", "CAGT-291", "CA-293", "CAGT-288", "CA-323",
  "CA-317", "CA-312", "CA-311", "CA-299", "CA-286", "CA-274", "CA-263", "CA-257", "CA-223", "CA-224",
  "CA-013", "CA-095", "CA-108", "CA-275", "CA-248", "CA-200", "CA-171", "CA-040", "CA-111", "CA-047",
  "CA-243", "CA-176", "CA-278", "CAGT-198", "CAGT-262", "CAGT-261", "CA-265", "CA-081", "CA-126", "CA-090",
  "CA-209", "CA-212", "CAGT-281"
]);

async function main() {
  const db = firebaseAdmin.firestore();
  const snapshot = await db.collection('stores').get();
  
  let markedActive = 0;
  let markedInactive = 0;
  
  console.log(`Analyzing ${snapshot.size} stores...`);
  
  const batch = db.batch();
  
  snapshot.forEach(doc => {
    const data = doc.data();
    const code = data.cafeCode;
    
    if (!code) {
      console.log(`Skipping doc ${doc.id} - no cafeCode`);
      return;
    }
    
    const shouldBeActive = ACTIVE_STORE_CODES.has(code);
    const currentlyActive = data.isActive !== false;
    
    if (shouldBeActive !== currentlyActive) {
      batch.update(doc.ref, { isActive: shouldBeActive });
      if (shouldBeActive) {
        markedActive++;
      } else {
        markedInactive++;
      }
    }
  });
  
  if (markedActive > 0 || markedInactive > 0) {
    console.log(`Committing batch: marking ${markedActive} stores Active, ${markedInactive} stores Inactive...`);
    await batch.commit();
    console.log('Update completed successfully.');
  } else {
    console.log('No changes required. All stores already match the active/inactive criteria.');
  }
}

main().catch(console.error);
