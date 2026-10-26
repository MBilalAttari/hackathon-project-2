"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { ROLES } from "@/lib/constants";
import { Card, Button, Badge, Modal, EmptyState, SkeletonLoader } from "../common/UI";
import { Megaphone, PlusCircle, AlertTriangle, Info, Calendar } from "lucide-react";

export function AnnouncementsView() {
  const { user, role, fetchWithAuth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    content: "",
    priority: "Normal",
    targetAudience: "All",
  });

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth("/api/announcements");
      if (res.ok) {
        setAnnouncements(await res.json());
      }
    } catch (err) {
      console.error("Failed to load announcements:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, [fetchWithAuth]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetchWithAuth("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to post announcement");

      setIsModalOpen(false);
      setForm({ title: "", content: "", priority: "Normal", targetAudience: "All" });
      await loadAnnouncements();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-blue-600" />
            <span>Company Announcements</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Broadcast official notices, policy revisions, and general communications
          </p>
        </div>

        {role !== ROLES.EMPLOYEE && (
          <Button
            variant="primary"
            size="sm"
            icon={PlusCircle}
            onClick={() => setIsModalOpen(true)}
          >
            Post Announcement
          </Button>
        )}
      </div>

      {/* Announcements Feed */}
      {loading ? (
        <SkeletonLoader rows={4} />
      ) : announcements.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No Announcements Yet"
          description="Official company announcements and updates will be shown here."
          action={
            role !== ROLES.EMPLOYEE && (
              <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
                Post First Announcement
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-4">
          {announcements.map((item) => (
            <div
              key={item.id}
              className={`p-5 rounded-2xl border transition-all ${
                item.priority === "Urgent"
                  ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900"
                  : item.priority === "Important"
                  ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      {item.title}
                    </h3>
                    <Badge
                      variant={
                        item.priority === "Urgent"
                          ? "danger"
                          : item.priority === "Important"
                          ? "warning"
                          : "primary"
                      }
                      size="sm"
                    >
                      {item.priority}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Posted by <strong className="text-slate-700 dark:text-slate-300">{item.createdByName}</strong> ({item.createdByRole}) • {new Date(item.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {item.content}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Post Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Post Company Announcement"
        subtitle="Broadcast a message to company staff"
      >
        <form onSubmit={handleCreate} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Title *
            </label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Office Closure for Eid Holidays"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Priority
              </label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="Normal">Normal</option>
                <option value="Important">Important</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Audience
              </label>
              <select
                value={form.targetAudience}
                onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="All">All Staff</option>
                <option value="Engineering">Engineering Only</option>
                <option value="HR">HR Only</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Announcement Content *
            </label>
            <textarea
              required
              rows={5}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Provide complete details..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <Button variant="outline" size="md" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" type="submit" loading={actionLoading}>
              Publish Announcement
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
