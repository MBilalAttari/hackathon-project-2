"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/common/Toast";
import { ROLES } from "@/lib/constants";
import { Card, Button, Badge, Modal, EmptyState, SkeletonLoader } from "../common/UI";
import { Employee360Modal } from "./Employee360Modal";
import Papa from "papaparse";
import {
  Users,
  UserPlus,
  Download,
  Upload,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  AlertCircle,
  FileSpreadsheet,
  LayoutGrid,
  List,
  Mail,
  Phone,
  Briefcase,
  Building,
} from "lucide-react";

export function EmployeeDirectory() {
  const { fetchWithAuth, role, organization } = useAuth();
  const { showToast } = useToast();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'table'

  // Modals state
  const [selected360Id, setSelected360Id] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvPreview, setCsvPreview] = useState([]);
  const [csvError, setCsvError] = useState("");
  const [saving, setSaving] = useState(false);

  // Form State
  const initialForm = {
    name: "",
    email: "",
    phone: "",
    department: "Engineering",
    designation: "Software Engineer",
    role: ROLES.EMPLOYEE,
    status: "Active",
    joiningDate: new Date().toISOString().slice(0, 10),
    grossSalary: 150000,
    bankName: "Meezan Bank",
    accountNumber: "0101-1234567890",
    iban: "PK36MEZN0001011234567890",
  };
  const [formData, setFormData] = useState(initialForm);

  const fileInputRef = useRef(null);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth("/api/employees");
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
      }
    } catch (err) {
      console.error("Failed to load employees:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, [fetchWithAuth]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingEmp(null);
    setFormData(initialForm);
    setIsFormOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (emp) => {
    setEditingEmp(emp);
    setFormData({
      name: emp.name,
      email: emp.email,
      phone: emp.phone || "",
      department: emp.department || "Engineering",
      designation: emp.designation || "Staff",
      role: emp.role || ROLES.EMPLOYEE,
      status: emp.status || "Active",
      joiningDate: emp.joiningDate || new Date().toISOString().slice(0, 10),
      grossSalary: emp.grossSalary || 150000,
      bankName: emp.bankDetails?.bankName || "Meezan Bank",
      accountNumber: emp.bankDetails?.accountNumber || "",
      iban: emp.bankDetails?.iban || "",
    });
    setIsFormOpen(true);
  };

  const handleSaveEmployee = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const gross = Number(formData.grossSalary) || 0;
      const base = Math.round(gross * 0.6);
      const houseRent = Math.round(gross * 0.2);
      const medical = Math.round(gross * 0.1);
      const other = gross - (base + houseRent + medical);

      const payload = {
        ...(editingEmp ? { id: editingEmp.id } : {}),
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        department: formData.department,
        designation: formData.designation,
        role: formData.role,
        status: formData.status,
        joiningDate: formData.joiningDate,
        grossSalary: gross,
        baseSalary: base,
        houseRentAllowance: houseRent,
        medicalAllowance: medical,
        otherAllowance: other,
        bankDetails: {
          bankName: formData.bankName,
          accountNumber: formData.accountNumber,
          iban: formData.iban,
        },
      };

      const res = await fetchWithAuth("/api/employees", {
        method: editingEmp ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save employee");

      showToast(
        editingEmp
          ? `Updated profile for ${formData.name}`
          : `Created new employee profile: ${formData.name}`,
        "success"
      );

      setIsFormOpen(false);
      await loadEmployees();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEmployee = async (id, name) => {
    if (!confirm(`Are you sure you want to delete ${name}? This action is irreversible.`)) return;
    try {
      const res = await fetchWithAuth(`/api/employees?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast(`Deleted employee: ${name}`, "info");
        await loadEmployees();
      } else {
        const data = await res.json();
        showToast(data.error || "Delete failed", "error");
      }
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    const csvData = employees.map((e) => ({
      Code: e.employeeCode,
      Name: e.name,
      Email: e.email,
      Department: e.department,
      Designation: e.designation,
      Role: e.role,
      Status: e.status,
      GrossSalary: e.grossSalary || 0,
      JoiningDate: e.joiningDate || "",
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `HCM_Employees_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${employees.length} employee records to CSV`, "success");
  };

  // CSV File Parse
  const handleCsvFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvError("");

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (!results.data || results.data.length === 0) {
          setCsvError("CSV file is empty or unreadable.");
          return;
        }

        const validRows = results.data.map((row, idx) => ({
          name: row.Name || row.name || `Employee ${idx + 1}`,
          email: row.Email || row.email || `employee${idx + 1}@company.com`,
          department: row.Department || row.department || "Engineering",
          designation: row.Designation || row.designation || "Staff",
          grossSalary: Number(row.GrossSalary || row.gross_salary || row.Salary || 120000),
          role: row.Role || row.role || ROLES.EMPLOYEE,
          status: row.Status || row.status || "Active",
          joiningDate: row.JoiningDate || row.joining_date || new Date().toISOString().slice(0, 10),
        }));

        setCsvPreview(validRows);
      },
      error: (err) => {
        setCsvError("CSV parsing error: " + err.message);
      },
    });
  };

  // Save CSV Bulk Import
  const handleSaveCsvImport = async () => {
    if (csvPreview.length === 0) return;
    setSaving(true);
    try {
      for (const item of csvPreview) {
        await fetchWithAuth("/api/employees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
        });
      }
      showToast(`Successfully imported ${csvPreview.length} employees`, "success");
      setIsCsvModalOpen(false);
      setCsvPreview([]);
      await loadEmployees();
    } catch (err) {
      showToast("Error importing CSV: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  // Filter employees
  const filtered = employees.filter((e) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      e.name.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      (e.employeeCode && e.employeeCode.toLowerCase().includes(q));

    const matchDept = !deptFilter || e.department === deptFilter;
    const matchStatus = !statusFilter || e.status === statusFilter;

    return matchSearch && matchDept && matchStatus;
  });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2 tracking-tight">
            <Users className="w-5 h-5 text-blue-600" />
            <span>Employee Directory</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Personnel profiles, salary structures, CSV bulk workflows & Employee 360
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === "grid"
                  ? "bg-white dark:bg-slate-900 text-blue-600 shadow-2xs"
                  : "text-slate-400 hover:text-slate-600"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === "table"
                  ? "bg-white dark:bg-slate-900 text-blue-600 shadow-2xs"
                  : "text-slate-400 hover:text-slate-600"
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {role !== ROLES.EMPLOYEE && (
            <>
              <Button
                variant="outline"
                size="sm"
                icon={Download}
                onClick={handleExportCSV}
                disabled={employees.length === 0}
              >
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={Upload}
                onClick={() => {
                  setCsvPreview([]);
                  setCsvError("");
                  setIsCsvModalOpen(true);
                }}
              >
                Import CSV
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={UserPlus}
                onClick={handleOpenCreate}
              >
                Add Employee
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or employee code..."
            className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 shadow-2xs focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="w-full sm:w-48 px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs"
        >
          <option value="">All Departments</option>
          {(organization?.departments || [
            "Engineering",
            "Human Resources",
            "Product & Design",
            "Finance & Accounts",
          ]).map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-36 px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs"
        >
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="On Leave">On Leave</option>
          <option value="Terminated">Terminated</option>
        </select>
      </div>

      {/* Main Content: Grid View or Table View */}
      {loading ? (
        <SkeletonLoader rows={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Employees Found"
          description={
            employees.length === 0
              ? "Your directory is completely empty. Add your first employee or import via CSV!"
              : "No employees match your current filter parameters."
          }
          action={
            employees.length === 0 && role !== ROLES.EMPLOYEE ? (
              <Button variant="primary" size="md" onClick={handleOpenCreate}>
                Add First Employee
              </Button>
            ) : null
          }
        />
      ) : viewMode === "grid" ? (
        /* GRID CARDS VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((emp) => (
            <div
              key={emp.id}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                      {emp.name?.[0]?.toUpperCase() || "E"}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-tight">
                        {emp.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                        {emp.employeeCode}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      emp.status === "Active"
                        ? "success"
                        : emp.status === "On Leave"
                        ? "warning"
                        : "danger"
                    }
                    size="sm"
                  >
                    {emp.status}
                  </Badge>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-medium truncate">{emp.designation}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{emp.department}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{emp.email}</span>
                  </div>
                </div>

                {role !== ROLES.EMPLOYEE && emp.grossSalary && (
                  <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
                    <span className="text-slate-400 text-[11px]">Gross Salary</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {organization?.currency || "PKR"} {Number(emp.grossSalary).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  icon={Eye}
                  onClick={() => setSelected360Id(emp.id)}
                  className="w-full text-xs"
                >
                  Employee 360
                </Button>

                {role !== ROLES.EMPLOYEE && (
                  <button
                    onClick={() => handleOpenEdit(emp)}
                    className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                    title="Edit Profile"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}

                {role === ROLES.ADMIN && (
                  <button
                    onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="Delete Employee"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Department & Role</th>
                  <th className="py-3 px-4">Status</th>
                  {role !== ROLES.EMPLOYEE && <th className="py-3 px-4">Monthly Gross</th>}
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((emp) => (
                  <tr
                    key={emp.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center shrink-0">
                          {emp.name?.[0]?.toUpperCase() || "E"}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">
                            {emp.name}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {emp.email} • {emp.employeeCode}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-medium text-slate-800 dark:text-slate-200">
                        {emp.designation}
                      </p>
                      <p className="text-[11px] text-slate-500">{emp.department}</p>
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge
                        variant={
                          emp.status === "Active"
                            ? "success"
                            : emp.status === "On Leave"
                            ? "warning"
                            : "danger"
                        }
                        size="sm"
                      >
                        {emp.status}
                      </Badge>
                    </td>

                    {role !== ROLES.EMPLOYEE && (
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                        {organization?.currency || "PKR"}{" "}
                        {Number(emp.grossSalary || 0).toLocaleString()}
                      </td>
                    )}

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          icon={Eye}
                          onClick={() => setSelected360Id(emp.id)}
                          title="View Employee 360"
                        >
                          360 View
                        </Button>

                        {role !== ROLES.EMPLOYEE && (
                          <button
                            onClick={() => handleOpenEdit(emp)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                            title="Edit Employee"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}

                        {role === ROLES.ADMIN && (
                          <button
                            onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            title="Delete Employee"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Employee 360 Modal */}
      {selected360Id && (
        <Employee360Modal
          employeeId={selected360Id}
          isOpen={Boolean(selected360Id)}
          onClose={() => setSelected360Id(null)}
        />
      )}

      {/* Add / Edit Employee Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingEmp ? "Edit Employee Profile" : "Add New Employee"}
        subtitle="Configure personal credentials and compensation parameters"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSaveEmployee} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+92 300 1234567"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Department
              </label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                {(organization?.departments || [
                  "Engineering",
                  "Human Resources",
                  "Product & Design",
                  "Finance & Accounts",
                ]).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Job Designation
              </label>
              <input
                type="text"
                required
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                System Role
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value={ROLES.EMPLOYEE}>Employee</option>
                <option value={ROLES.HR}>HR Specialist</option>
                <option value={ROLES.ADMIN}>Administrator</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="Active">Active</option>
                <option value="On Leave">On Leave</option>
                <option value="Terminated">Terminated</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Date of Joining
              </label>
              <input
                type="date"
                value={formData.joiningDate}
                onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Salary Breakdown Block */}
          <div className="p-4 rounded-2xl border border-blue-100 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/20 space-y-3">
            <h5 className="font-bold text-blue-900 dark:text-blue-300">
              Salary Compensation Structure
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Total Monthly Gross Salary ({organization?.currency || "PKR"}) *
                </label>
                <input
                  type="number"
                  required
                  value={formData.grossSalary}
                  onChange={(e) => setFormData({ ...formData, grossSalary: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Account Number
                </label>
                <input
                  type="text"
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  IBAN Number
                </label>
                <input
                  type="text"
                  value={formData.iban}
                  onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              * Automatically allocates: Basic Salary (60%), House Rent (20%), Medical & Utility (10%), Other (10%).
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <Button variant="outline" size="md" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" type="submit" loading={saving}>
              {editingEmp ? "Update Profile" : "Create Profile"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* CSV Bulk Import Modal */}
      <Modal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        title="Bulk Import Employees from CSV"
        subtitle="Upload a standard CSV file with employee details"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4 text-xs">
          <div className="p-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-center space-y-2 bg-slate-50/50 dark:bg-slate-800/20">
            <FileSpreadsheet className="w-10 h-10 text-blue-500 mx-auto" />
            <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
              Select or drop your CSV file here
            </p>
            <p className="text-slate-500 text-[11px]">
              Headers expected: Name, Email, Department, Designation, GrossSalary, Role
            </p>
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv"
              onChange={handleCsvFileChange}
              className="mt-3 block mx-auto text-xs"
            />
          </div>

          {csvError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 border border-rose-200 dark:border-rose-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{csvError}</span>
            </div>
          )}

          {csvPreview.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  Preview ({csvPreview.length} records ready to import)
                </span>
              </div>
              <div className="max-h-56 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold sticky top-0">
                    <tr>
                      <th className="p-2.5">Name</th>
                      <th className="p-2.5">Email</th>
                      <th className="p-2.5">Dept</th>
                      <th className="p-2.5">Gross Salary</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {csvPreview.map((row, i) => (
                      <tr key={i}>
                        <td className="p-2.5 font-medium">{row.name}</td>
                        <td className="p-2.5">{row.email}</td>
                        <td className="p-2.5">{row.department}</td>
                        <td className="p-2.5 font-bold text-blue-600">
                          {organization?.currency || "PKR"} {Number(row.grossSalary).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <Button variant="outline" size="md" onClick={() => setIsCsvModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              disabled={csvPreview.length === 0}
              loading={saving}
              onClick={handleSaveCsvImport}
            >
              Confirm Import ({csvPreview.length})
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
