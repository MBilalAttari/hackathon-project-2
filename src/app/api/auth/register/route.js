import { getUsers, saveUser, saveEmployee, getUserByEmail, getOrganizationSettings } from "@/lib/db/store";
import { jsonResponse } from "@/lib/apiHelper";
import { ROLES } from "@/lib/constants";

const FIREBASE_API_KEY =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
  "AIzaSyBIhgShnll7ms0u_QT6whpgfoEcqobV_3E";

const ADMIN_EMAIL = (
  process.env.ADMIN_EMAIL ||
  "attarib352@gmail.com"
).toLowerCase().trim();

async function createFirebaseUser(email, password, displayName) {
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          displayName,
          returnSecureToken: true,
        }),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      if (data.error?.message === "EMAIL_EXISTS") {
        throw new Error("An account with this email already exists");
      }
      return null;
    }
    return data;
  } catch (err) {
    if (err.message.includes("already exists")) throw err;
    console.warn("Firebase createFirebaseUser fallback:", err.message);
    return null;
  }
}

export async function POST(request) {
  try {
    const { name, email, password, role } = await request.json();
    if (!name || !email) {
      return jsonResponse({ error: "Name and email are required" }, 400);
    }
    if (!password || password.length < 6) {
      return jsonResponse({ error: "Password must be at least 6 characters" }, 400);
    }

    const normalizedEmail = email.toLowerCase().trim();

    // STRICT PROTECTION: Admin account cannot be created via public registration
    if (normalizedEmail === ADMIN_EMAIL) {
      return jsonResponse(
        {
          error: "Admin account is pre-configured. Please log in directly with your admin credentials.",
        },
        403
      );
    }

    // STRICT PROTECTION: Nobody can register as Admin
    if (role === ROLES.ADMIN || role === "Admin") {
      return jsonResponse(
        {
          error: "Admin accounts cannot be self-registered. Registration is limited to HR and Employee roles.",
        },
        403
      );
    }

    const existingUser = await getUserByEmail(normalizedEmail);
    if (existingUser) {
      return jsonResponse({ error: "An account with this email already exists" }, 400);
    }

    // Attempt Firebase Auth sign up
    let firebaseUser = null;
    try {
      firebaseUser = await createFirebaseUser(normalizedEmail, password, name);
    } catch (err) {
      return jsonResponse({ error: err.message }, 400);
    }

    // Assigned role is strictly HR or Employee
    const assignedRole = role === ROLES.HR ? ROLES.HR : ROLES.EMPLOYEE;

    const newUser = await saveUser({
      id: firebaseUser?.localId || undefined,
      name,
      email: normalizedEmail,
      role: assignedRole,
      password, // retained for fallback verification
    });

    const newEmployee = await saveEmployee(
      {
        userId: newUser.id,
        name,
        email: normalizedEmail,
        role: assignedRole,
        department: assignedRole === ROLES.HR ? "Human Resources" : "Engineering",
        designation: assignedRole === ROLES.HR ? "HR Specialist" : "Software Engineer",
        status: "Active",
        grossSalary: assignedRole === ROLES.HR ? 150000 : 120000,
      },
      newUser
    );

    newUser.employeeId = newEmployee.id;
    await saveUser(newUser);

    const session = {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      employeeId: newEmployee.id,
      idToken: firebaseUser?.idToken || null,
    };

    return jsonResponse({
      success: true,
      user: session,
    });
  } catch (err) {
    console.error("Register error:", err);
    return jsonResponse({ error: err.message }, 500);
  }
}
