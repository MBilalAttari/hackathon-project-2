import { jsonResponse } from "@/lib/apiHelper";
import { getUserByEmail, saveUser, getEmployeeByEmail, saveEmployee, createAuditLog } from "@/lib/db/store";
import { AUDIT_ACTIONS, ROLES } from "@/lib/constants";

const FIREBASE_API_KEY =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
  "AIzaSyBIhgShnll7ms0u_QT6whpgfoEcqobV_3E";

const ADMIN_EMAIL = (
  process.env.ADMIN_EMAIL ||
  "attarib352@gmail.com"
).toLowerCase().trim();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "bilal145@@";

async function signInWithFirebase(email, password) {
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );
    const data = await res.json();
    if (res.ok && data.idToken) {
      return data;
    }
    return null;
  } catch (err) {
    console.warn("Firebase signInWithPassword failed:", err.message);
    return null;
  }
}

export async function POST(request) {
  try {
    const { email, password } = await request.json();
    if (!email) {
      return jsonResponse({ error: "Email is required" }, 400);
    }

    const normalizedEmail = email.toLowerCase().trim();
    const isAdminEmail = normalizedEmail === ADMIN_EMAIL;

    let firebaseUser = null;
    let isAuthenticated = false;

    // Strict Admin authentication: Master password or Firebase Auth
    if (isAdminEmail) {
      if (!password) {
        return jsonResponse({ error: "Password is required for Admin login" }, 400);
      }
      if (password === ADMIN_PASSWORD) {
        isAuthenticated = true;
      }
    }

    if (password) {
      firebaseUser = await signInWithFirebase(normalizedEmail, password);
      if (firebaseUser) {
        isAuthenticated = true;
      }
    }

    let user = await getUserByEmail(normalizedEmail);
    let employee = await getEmployeeByEmail(normalizedEmail);

    // Non-admin portal authentication
    if (!isAuthenticated && !isAdminEmail) {
      if (user) {
        if (!user.password || !password || user.password === password) {
          isAuthenticated = true;
        }
      } else if (employee) {
        isAuthenticated = true;
      }
    }

    if (!isAuthenticated) {
      return jsonResponse({ error: "Invalid email or password" }, 401);
    }

    // Ensure Admin profile is seeded if logging in as Admin
    if (isAdminEmail) {
      if (!user) {
        user = await saveUser({
          id: firebaseUser?.localId || "admin_primary",
          email: normalizedEmail,
          name: firebaseUser?.displayName || "System Administrator",
          role: ROLES.ADMIN,
        });
      } else if (user.role !== ROLES.ADMIN) {
        user.role = ROLES.ADMIN;
        await saveUser(user);
      }

      if (!employee) {
        employee = await saveEmployee(
          {
            userId: user.id,
            name: user.name || "System Administrator",
            email: normalizedEmail,
            role: ROLES.ADMIN,
            department: "Executive",
            designation: "System Administrator",
            status: "Active",
            grossSalary: 350000,
          },
          user
        );
      }
    } else {
      if (!user) {
        user = await saveUser({
          id: firebaseUser?.localId,
          email: normalizedEmail,
          name: firebaseUser?.displayName || employee?.name || normalizedEmail.split("@")[0],
          role: employee?.role === ROLES.HR ? ROLES.HR : ROLES.EMPLOYEE,
          employeeId: employee?.id || null,
        });
      }
    }

    const role = isAdminEmail ? ROLES.ADMIN : (user.role === ROLES.ADMIN ? ROLES.EMPLOYEE : (user.role || ROLES.EMPLOYEE));
    const employeeId = employee?.id || user.employeeId || user.id;

    const session = {
      id: user.id || firebaseUser?.localId,
      email: normalizedEmail,
      name: user.name || employee?.name || normalizedEmail.split("@")[0],
      role,
      employeeId,
      department: employee?.department || (isAdminEmail ? "Executive" : "General"),
      idToken: firebaseUser?.idToken || null,
    };

    await createAuditLog({
      action: AUDIT_ACTIONS.USER_LOGIN,
      actor: session,
      details: `User logged in: ${session.email} as ${session.role}`,
      targetId: session.id,
    });

    return jsonResponse({
      success: true,
      user: session,
    });
  } catch (err) {
    console.error("Login error:", err);
    return jsonResponse({ error: err.message }, 500);
  }
}
