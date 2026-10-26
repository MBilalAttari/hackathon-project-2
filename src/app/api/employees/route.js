import { getEmployees, saveEmployee, deleteEmployee, saveUser, getUserByEmail } from "@/lib/db/store";
import { getSessionFromRequest, jsonResponse, unauthorizedResponse, forbiddenResponse } from "@/lib/apiHelper";
import { ROLES } from "@/lib/constants";

export async function GET(request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const department = searchParams.get("department");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const employees = await getEmployees({ department, status, search });

    // Role-level data protection: Employees shouldn't see confidential salary/bank data of peers
    if (session.role === ROLES.EMPLOYEE) {
      const sanitized = employees.map(emp => {
        if (emp.id === session.employeeId) return emp; // full access to own record
        return {
          id: emp.id,
          employeeCode: emp.employeeCode,
          name: emp.name,
          email: emp.email,
          phone: emp.phone,
          department: emp.department,
          designation: emp.designation,
          status: emp.status,
          joiningDate: emp.joiningDate,
        };
      });
      return jsonResponse(sanitized);
    }

    return jsonResponse(employees);
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

export async function POST(request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return unauthorizedResponse();
    if (session.role !== ROLES.ADMIN && session.role !== ROLES.HR) {
      return forbiddenResponse("Only HR and Admin can create employees.");
    }

    const payload = await request.json();
    if (!payload.name || !payload.email) {
      return jsonResponse({ error: "Employee name and email are required" }, 400);
    }

    const saved = await saveEmployee(payload, session);

    // Auto-create user account if not existing so the employee can login
    const existingUser = await getUserByEmail(saved.email);
    if (!existingUser) {
      await saveUser({
        name: saved.name,
        email: saved.email,
        role: saved.role || ROLES.EMPLOYEE,
        employeeId: saved.id,
      });
    }

    return jsonResponse({ success: true, employee: saved });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

export async function PUT(request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return unauthorizedResponse();
    if (session.role !== ROLES.ADMIN && session.role !== ROLES.HR) {
      return forbiddenResponse("Only HR and Admin can edit employees.");
    }

    const payload = await request.json();
    if (!payload.id) {
      return jsonResponse({ error: "Employee ID is required" }, 400);
    }

    const updated = await saveEmployee(payload, session);
    return jsonResponse({ success: true, employee: updated });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

export async function DELETE(request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return unauthorizedResponse();
    if (session.role !== ROLES.ADMIN) {
      return forbiddenResponse("Only Admin can delete an employee record.");
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return jsonResponse({ error: "Employee ID is required" }, 400);

    await deleteEmployee(id, session);
    return jsonResponse({ success: true });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}
