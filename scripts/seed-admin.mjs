// Script to seed the protected Admin account into RTDB and local store
import { rtdb } from "../src/lib/firebase/rtdb.js";
import { saveUser, saveEmployee, getOrganizationSettings, updateOrganizationSettings } from "../src/lib/db/store.js";
import { ROLES } from "../src/lib/constants.js";

async function main() {
  console.log("Seeding Admin account...");
  const adminEmail = "attarib352@gmail.com";

  // 1. Ensure Organization settings exist
  const org = await getOrganizationSettings();
  if (!org.isSetupComplete) {
    org.isSetupComplete = true;
    org.companyName = "Saylani HCM Enterprise";
    await updateOrganizationSettings(org);
    console.log("Organization setup marked complete.");
  }

  // 2. Save Admin user
  const adminUser = await saveUser({
    id: "admin_attarib352",
    email: adminEmail,
    name: "Bilal Attari (Admin)",
    role: ROLES.ADMIN,
  });
  console.log("Admin user created/verified:", adminUser.email, adminUser.role);

  // 3. Save Admin employee profile
  const adminEmp = await saveEmployee({
    userId: adminUser.id,
    name: "Bilal Attari (Admin)",
    email: adminEmail,
    role: ROLES.ADMIN,
    department: "Executive",
    designation: "Chief Executive Officer / System Administrator",
    status: "Active",
    grossSalary: 500000,
  });
  console.log("Admin employee profile created/verified:", adminEmp.name, adminEmp.designation);

  console.log("Admin seeding completed successfully!");
}

main().catch(err => {
  console.error("Seed error:", err);
  process.exit(1);
});
