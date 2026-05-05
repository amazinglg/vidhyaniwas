import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Plus,
  Search,
  Filter,
  IndianRupee,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Settings2,
  Download,
  BanknoteIcon,
  History,
  FileDown,
  Layers,
} from "lucide-react";
import BulkMaintenanceDialog from "@/components/BulkMaintenanceDialog";
import BulkDeleteMaintenanceDialog from "@/components/BulkDeleteMaintenanceDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useResidents, useMaintenanceCollections } from "@/hooks/useSocietyData";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import StatCard from "@/components/dashboard/StatCard";
import AuditHistoryDialog from "@/components/AuditHistoryDialog";
import MaintenanceConflictDialog, { ConflictReason } from "@/components/MaintenanceConflictDialog";
import { findExistingMainEntryForFY, MAX_DUE_PER_FY } from "@/utils/maintenanceFY";
import { downloadReceipt } from "@/utils/generateReceipt";
import { triggerPush } from "@/lib/triggerPush";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, SectionCard } from "@/components/layout/PagePrimitives";

const statusBadge: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  paid: "default",
  partial: "secondary",
  pending: "outline",
  overdue: "destructive",
};

const STORAGE_KEY = "society_default_maintenance";

const getStoredDefault = (): number => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v) return Number(v);
  } catch {}
  return 9000;
};

const Maintenance = () => {
  const { data: collections = [], isLoading } = useMaintenanceCollections();
  const { data: residents = [] } = useResidents();
  const { isAdmin, isCoordinator, isResident, isMasterAdmin, userRole, user } = useAuth();
  const { t } = useLanguage();
  const canBulk = isMasterAdmin || userRole === "treasury_head";
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [supervisorResidentIds, setSupervisorResidentIds] = useState<string[]>([]);
  const queryClient = useQueryClient();

  // Fetch supervisor residents to exclude them from maintenance lists
  useEffect(() => {
    void (async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "supervisor");
      const userIds = (roles || []).map((r: any) => r.user_id);
      if (userIds.length === 0) {
        setSupervisorResidentIds([]);
        return;
      }
      const { data: profs } = await supabase.from("profiles").select("resident_id").in("user_id", userIds);
      setSupervisorResidentIds((profs || []).map((p: any) => p.resident_id).filter(Boolean));
    })();
  }, []);
  const [search, setSearch] = useState("");
  const [searchParams] = useSearchParams();
  const initialFilter = searchParams.get("filter");
  const [filterStatus, setFilterStatus] = useState(
    initialFilter === "paid"
      ? "paid"
      : initialFilter === "pending"
        ? "pending"
        : initialFilter === "partial"
          ? "partial"
          : initialFilter === "overdue"
            ? "overdue"
            : "all",
  );
  useEffect(() => {
    const f = searchParams.get("filter");
    if (f && ["paid", "pending", "partial", "overdue"].includes(f)) setFilterStatus(f);
  }, [searchParams]);
  const [filterMonth, setFilterMonth] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [storedDefault, setStoredDefault] = useState(getStoredDefault);
  const [form, setForm] = useState({
    residentId: "",
    totalMaintenance: String(storedDefault),
    amount: "",
    date: new Date().toISOString().split("T")[0],
    paymentMode: "upi",
    dueDate: "",
  });
  const [defaultAmountDialog, setDefaultAmountDialog] = useState(false);
  const [defaultAmount, setDefaultAmount] = useState(String(storedDefault));
  const [duePaymentDialog, setDuePaymentDialog] = useState(false);
  const [duePaymentEntry, setDuePaymentEntry] = useState<any>(null);
  const [duePaymentForm, setDuePaymentForm] = useState({
    amount: "",
    date: new Date().toISOString().split("T")[0],
    paymentMode: "upi",
  });
  const [historyRecordId, setHistoryRecordId] = useState<string | null>(null);
  const [conflict, setConflict] = useState<ConflictReason | null>(null);
  const [pendingPayload, setPendingPayload] = useState<any>(null);
  const [pendingExistingId, setPendingExistingId] = useState<string | null>(null);
  const readOnly = isResident || isCoordinator;

  const computeDue = (total: number, paid: number) => Math.max(0, total - paid);

  const filtered = useMemo(
    () =>
      collections.filter((c: any) => {
        if (supervisorResidentIds.includes(c.resident_id)) return false;
        const name = (c.residents as any)?.name || "";
        const houseNo = (c.residents as any)?.house_no || "";
        const matchSearch =
          name.toLowerCase().includes(search.toLowerCase()) || houseNo.toLowerCase().includes(search.toLowerCase());
        const matchStatus = filterStatus === "all" || c.status === filterStatus;
        const matchMonth = filterMonth === "all" || c.month === filterMonth;
        return matchSearch && matchStatus && matchMonth;
      }),
    [collections, search, filterStatus, filterMonth, supervisorResidentIds],
  );

  // Residents list for the "record payment" dropdown — also exclude supervisors
  const eligibleResidents = useMemo(
    () => residents.filter((r: any) => !supervisorResidentIds.includes(r.id)),
    [residents, supervisorResidentIds],
  );

  const totalCollected = filtered.reduce((s: number, c: any) => s + Number(c.amount || 0), 0);
  const totalPending = filtered.reduce((s: number, c: any) => s + Number(c.due_amount || 0), 0);

  const MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const openAdd = () => {
    setEditingId(null);
    setForm({
      residentId: "",
      totalMaintenance: String(storedDefault),
      amount: "",
      date: new Date().toISOString().split("T")[0],
      paymentMode: "upi",
        dueDate: "",
    });
    setDialogOpen(true);
  };

  const openEdit = (c: any) => {
    setEditingId(c.id);
    setForm({
      residentId: c.resident_id,
      totalMaintenance: String(c.total_maintenance || storedDefault),
      amount: String(c.amount),
      date: c.paid_date || new Date().toISOString().split("T")[0],
      paymentMode: c.payment_mode || "upi",
      dueDate: c.due_date || "",
    });
    setDialogOpen(true);
  };

  const openDuePayment = (c: any) => {
    setDuePaymentEntry(c);
    setDuePaymentForm({
      amount: String(c.due_amount),
      date: new Date().toISOString().split("T")[0],
      paymentMode: "upi",
      });
    setDuePaymentDialog(true);
  };

  const commitManualEntry = async (payload: any, mode: "insert" | "update", updateId?: string | null) => {
    if (mode === "update" && updateId) {
      const { error } = await supabase.from("maintenance_collections").update(payload).eq("id", updateId);
      if (error) {
        toast.error(error.message);
        return false;
      }
    } else {
      const { error } = await supabase.from("maintenance_collections").insert(payload);
      if (error) {
        toast.error(error.message);
        return false;
      }
    }
    if (payload.resident_id) {
      void triggerPush({
        title: "Maintenance entry added",
        body: `${payload.month} ${payload.year} • ₹${payload.total_maintenance ?? payload.amount ?? ""}`,
        url: "/maintenance",
        tag: `maint-${payload.resident_id}`,
        audience: { kind: "residents", residentIds: [payload.resident_id] },
        excludeUserId: user?.id,
      });
    }
    toast.success(t("payment_recorded"));
    queryClient.invalidateQueries({ queryKey: ["maintenance_collections"] });
    setDialogOpen(false);
    return true;
  };

  const handleSave = async () => {
    if (!form.residentId || !form.amount) {
      toast.error(t("please_fill_required"));
      return;
    }
    const amt = Number(form.amount);
    const totalMaint = Number(form.totalMaintenance) || storedDefault;
    const dueAmount = computeDue(totalMaint, amt);
    const dateObj = new Date(form.date);
    const month = MONTHS[dateObj.getMonth()];
    const year = dateObj.getFullYear();
    const payload: any = {
      resident_id: form.residentId,
      amount: amt,
      due_amount: dueAmount,
      total_maintenance: totalMaint,
      paid_date: form.date,
      month,
      year,
      status: dueAmount <= 0 ? "paid" : amt > 0 ? "partial" : "pending",
      payment_mode: form.paymentMode,
      due_date: form.dueDate || null,
    };

    if (editingId) {
      // Editing an existing row — no FY/duplicate check needed.
      await commitManualEntry(payload, "update", editingId);
      return;
    }

    // Manual ADD: enforce one main entry + ≤10,000 due per FY
    const { fy, existing, totalDue } = await findExistingMainEntryForFY(form.residentId, form.date);
    const projectedDue = totalDue - Number(existing?.due_amount || 0) + dueAmount;
    const duplicate = !!existing;
    const breaches = projectedDue > MAX_DUE_PER_FY;

    if (duplicate || breaches) {
      const reason: ConflictReason =
        duplicate && breaches
          ? {
              kind: "both",
              fyLabel: fy.label,
              existingAmount: Number(existing.total_maintenance || 0),
              currentDue: totalDue,
              addingAmount: dueAmount,
            }
          : duplicate
            ? { kind: "duplicate", fyLabel: fy.label, existingAmount: Number(existing.total_maintenance || 0) }
            : { kind: "limit", fyLabel: fy.label, currentDue: totalDue, addingAmount: dueAmount };
      setPendingPayload(payload);
      // If duplicate → "Continue" updates the existing row; if only limit breach → "Continue" inserts new.
      setPendingExistingId(duplicate ? existing.id : null);
      setConflict(reason);
      return;
    }

    await commitManualEntry(payload, "insert");
  };

  const onConflictIgnore = () => {
    setConflict(null);
    setPendingPayload(null);
    setPendingExistingId(null);
  };

  const onConflictContinue = async () => {
    const payload = pendingPayload;
    const updateId = pendingExistingId;
    setConflict(null);
    setPendingPayload(null);
    setPendingExistingId(null);
    if (!payload) return;
    if (updateId) await commitManualEntry(payload, "update", updateId);
    else await commitManualEntry(payload, "insert");
  };

  const handleDuePayment = async () => {
    if (!duePaymentEntry || !duePaymentForm.amount) {
      toast.error(t("please_fill_required"));
      return;
    }
    const payAmount = Number(duePaymentForm.amount);
    const originalDue = Number(duePaymentEntry.due_amount);
    const previousPaid = Number(duePaymentEntry.amount);
    const totalMaint = Number(duePaymentEntry.total_maintenance);
    const remainingDue = Math.max(0, originalDue - payAmount);

    const newOriginalStatus = remainingDue <= 0 ? "paid" : "partial";
    await supabase
      .from("maintenance_collections")
      .update({
        due_amount: remainingDue,
        status: newOriginalStatus,
      })
      .eq("id", duePaymentEntry.id);

    const dateObj = new Date(duePaymentForm.date);
    const { error } = await supabase.from("maintenance_collections").insert({
      resident_id: duePaymentEntry.resident_id,
      amount: payAmount,
      due_amount: remainingDue,
      total_maintenance: totalMaint,
      paid_date: duePaymentForm.date,
      month: MONTHS[dateObj.getMonth()],
      year: dateObj.getFullYear(),
      status: remainingDue <= 0 ? "paid" : "partial",
      payment_mode: duePaymentForm.paymentMode,
    });
    if (error) {
      toast.error(error.message);
      return;
    }

    // Receipt is auto-created by DB trigger; user must click download button to get the PDF.
    // (No automatic PDF download — per user request #13)

    queryClient.invalidateQueries({ queryKey: ["maintenance_collections"] });
    setDuePaymentDialog(false);
    toast.success(t("due_payment_recorded"));
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("confirm_delete"))) return;
    const { error } = await supabase.from("maintenance_collections").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["maintenance_collections"] });
    toast.success(t("delete"));
  };

  const toggleVisibility = async (id: string, current: boolean) => {
    const { error } = await supabase.from("maintenance_collections").update({ is_visible: !current }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["maintenance_collections"] });
    toast.success(t("visibility_updated"));
  };

  const handleUpdateDefaultAmount = async () => {
    const newAmt = Number(defaultAmount);
    if (!newAmt || newAmt <= 0) {
      toast.error(t("please_fill_required"));
      return;
    }
    // Save to localStorage so it persists
    localStorage.setItem(STORAGE_KEY, String(newAmt));
    setStoredDefault(newAmt);

    // Update all existing records
    for (const c of collections) {
      const due = computeDue(newAmt, Number(c.amount || 0));
      const status = due <= 0 ? "paid" : Number(c.amount) > 0 ? "partial" : "pending";
      await supabase
        .from("maintenance_collections")
        .update({ due_amount: due, total_maintenance: newAmt, status })
        .eq("id", c.id);
    }
    queryClient.invalidateQueries({ queryKey: ["maintenance_collections"] });
    setDefaultAmountDialog(false);
    toast.success(t("amount_updated"));
  };

  const downloadCSV = () => {
    const headers = [
      t("resident"),
      t("house"),
      t("date"),
      "Total",
      t("paid"),
      t("due"),
      t("due_date"),
      t("mode"),
      t("status"),
    ];
    const rows = filtered.map((c: any) => [
      (c.residents as any)?.name || "",
      (c.residents as any)?.house_no || "",
      c.paid_date || "",
      c.total_maintenance,
      c.amount,
      c.due_amount,
      c.due_date || "",
      c.payment_mode || "",
      c.status,
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "maintenance_funds.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const getEffectiveStatus = (c: any) => {
    if (c.status === "paid") return "paid";
    if (c.due_date && new Date(c.due_date) < new Date() && Number(c.due_amount) > 0) return "overdue";
    return c.status;
  };

  const handleDownloadReceipt = async (c: any) => {
    const { data: receipt } = await supabase
      .from("maintenance_receipts")
      .select("*")
      .eq("maintenance_collection_id", c.id)
      .maybeSingle();
    const r: any = receipt || {};
    downloadReceipt({
      societyName: r.society_name || "Shri Vidhya Niwas Society",
      receiptDate: r.receipt_date || c.paid_date || new Date().toISOString().split("T")[0],
      residentName: r.resident_name || (c.residents as any)?.name || "",
      houseNo: r.house_no || (c.residents as any)?.house_no || "",
      laneNo: r.lane_no || (c.residents as any)?.lane_no || "",
      month: r.month || c.month,
      year: r.year || c.year,
      totalMaintenance: Number(r.total_maintenance || c.total_maintenance || 0),
      amountPaid: Number(r.amount_paid || c.amount || 0),
      dueAmount: Number(r.due_amount || c.due_amount || 0),
      paymentMode: r.payment_mode || c.payment_mode || "",
      notes: r.notes || "This is a digitally generated receipt and does not require a manual signature.",
      customFields: r.custom_fields || {},
    });
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        icon={IndianRupee}
        title={t("maintenance_fund")}
        subtitle={t("track_maintenance")}
        action={
          <div className="flex gap-1.5 flex-nowrap items-center justify-start sm:justify-end w-full overflow-x-auto">
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={downloadCSV} className="h-8 px-2.5 text-xs shrink-0">
                <Download className="h-3.5 w-3.5 mr-1" /> CSV
              </Button>
            )}
            {!readOnly && (
              <>
                {isMasterAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDefaultAmount(String(storedDefault));
                      setDefaultAmountDialog(true);
                    }}
                    className="h-8 px-2.5 text-xs shrink-0"
                  >
                    <Settings2 className="h-3.5 w-3.5 mr-1" /> {t("amount")}
                  </Button>
                )}
                {canBulk && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setBulkOpen(true)}
                      className="h-8 px-2.5 text-xs shrink-0"
                    >
                      <Layers className="h-3.5 w-3.5 mr-1" /> Bulk
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setBulkDeleteOpen(true)}
                      className="h-8 px-2.5 text-xs shrink-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Del
                    </Button>
                  </>
                )}
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={openAdd} size="sm" className="h-8 px-2.5 text-xs shrink-0">
                      <Plus className="h-3.5 w-3.5 mr-1" /> {t("add")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="font-display">
                        {editingId ? t("edit") + " " + t("record_payment") : t("record_payment")}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label>{t("resident")} *</Label>
                        <Select value={form.residentId} onValueChange={(v) => setForm({ ...form, residentId: v })}>
                          <SelectTrigger>
                            <SelectValue placeholder={t("select_resident")} />
                          </SelectTrigger>
                          <SelectContent>
                            {eligibleResidents.map((r: any) => (
                              <SelectItem key={r.id} value={r.id}>
                                {r.name} ({r.house_no})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label>{t("total_maintenance")} (₹)</Label>
                          <Input
                            type="number"
                            value={form.totalMaintenance}
                            onChange={(e) => setForm({ ...form, totalMaintenance: e.target.value })}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>{t("paid")} (₹) *</Label>
                          <Input
                            type="number"
                            value={form.amount}
                            onChange={(e) => setForm({ ...form, amount: e.target.value })}
                          />
                        </div>
                      </div>
                      {form.totalMaintenance && form.amount && (
                        <div className="p-3 rounded-lg bg-muted text-sm">
                          <span className="text-muted-foreground">{t("due")}: </span>
                          <span
                            className={`font-bold ${computeDue(Number(form.totalMaintenance), Number(form.amount)) > 0 ? "text-destructive" : "text-success"}`}
                          >
                            ₹{computeDue(Number(form.totalMaintenance), Number(form.amount)).toLocaleString("en-IN")}
                          </span>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label>{t("date")} *</Label>
                          <Input
                            type="date"
                            value={form.date}
                            onChange={(e) => setForm({ ...form, date: e.target.value })}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>{t("due_date")}</Label>
                          <Input
                            type="date"
                            value={form.dueDate}
                            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label>{t("payment_mode")}</Label>
                          <Select value={form.paymentMode} onValueChange={(v) => setForm({ ...form, paymentMode: v })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">{t("cash")}</SelectItem>
                              <SelectItem value="upi">{t("upi")}</SelectItem>
                              <SelectItem value="bank_transfer">{t("bank_transfer")}</SelectItem>
                              <SelectItem value="cheque">{t("cheque")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                      </div>
                      <Button onClick={handleSave} className="w-full mt-2">
                        {editingId ? t("update") : t("record_payment")}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        }
      />

      {/* Due Payment Dialog */}
      <Dialog open={duePaymentDialog} onOpenChange={setDuePaymentDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">{t("pay_due")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {duePaymentEntry && (
              <div className="p-3 rounded-lg bg-muted text-sm">
                <p>
                  <span className="text-muted-foreground">{t("resident")}:</span>{" "}
                  {(duePaymentEntry.residents as any)?.name}
                </p>
                <p>
                  <span className="text-muted-foreground">{t("due")}:</span>{" "}
                  <span className="font-bold text-destructive">
                    ₹{Number(duePaymentEntry.due_amount).toLocaleString("en-IN")}
                  </span>
                </p>
              </div>
            )}
            <div className="grid gap-2">
              <Label>{t("amount")} (₹) *</Label>
              <Input
                type="number"
                value={duePaymentForm.amount}
                onChange={(e) => setDuePaymentForm({ ...duePaymentForm, amount: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("date")} *</Label>
              <Input
                type="date"
                value={duePaymentForm.date}
                onChange={(e) => setDuePaymentForm({ ...duePaymentForm, date: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("payment_mode")}</Label>
              <Select
                value={duePaymentForm.paymentMode}
                onValueChange={(v) => setDuePaymentForm({ ...duePaymentForm, paymentMode: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{t("cash")}</SelectItem>
                  <SelectItem value="upi">{t("upi")}</SelectItem>
                  <SelectItem value="bank_transfer">{t("bank_transfer")}</SelectItem>
                  <SelectItem value="cheque">{t("cheque")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleDuePayment} className="w-full gradient-warm text-primary-foreground">
              {t("pay_due")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={defaultAmountDialog} onOpenChange={setDefaultAmountDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">{t("set_default_amount")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t("total_maintenance")} (₹)</Label>
              <Input type="number" value={defaultAmount} onChange={(e) => setDefaultAmount(e.target.value)} />
              <p className="text-xs text-muted-foreground">{t("default_amount_note")}</p>
            </div>
            <Button onClick={handleUpdateDefaultAmount} className="w-full gradient-warm text-primary-foreground">
              {t("update")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          title={t("total_collected")}
          value={`₹${totalCollected.toLocaleString("en-IN")}`}
          icon={IndianRupee}
          variant="success"
        />
        <StatCard
          title={t("pending_dues")}
          value={`₹${totalPending.toLocaleString("en-IN")}`}
          icon={AlertTriangle}
          variant="warning"
        />
        <StatCard
          title={t("paid")}
          value={String(filtered.filter((c: any) => c.status === "paid").length)}
          icon={CheckCircle2}
          variant="primary"
        />
        <StatCard
          title={t("overdue")}
          value={String(
            filtered.filter((c: any) => getEffectiveStatus(c) === "overdue" || c.status === "pending").length,
          )}
          icon={Clock}
          variant="destructive"
        />
      </div>

      <SectionCard className="py-3 md:py-3">
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder={t("search_residents")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-32">
                <Filter className="h-4 w-4 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("all_status")}</SelectItem>
                <SelectItem value="paid">{t("paid")}</SelectItem>
                <SelectItem value="partial">{t("partial")}</SelectItem>
                <SelectItem value="pending">{t("pending")}</SelectItem>
                <SelectItem value="overdue">{t("overdue")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("all_months")}</SelectItem>
                {MONTHS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </SectionCard>

      {/* Mobile card view */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">{t("loading")}</p>
        ) : filtered.length === 0 ? (
          <SectionCard className="p-8 text-center text-muted-foreground">{t("no_records_found")}</SectionCard>
        ) : (
          filtered.map((c: any) => {
            const effectiveStatus = getEffectiveStatus(c);
            return (
              <SectionCard key={c.id} className="py-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">{(c.residents as any)?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(c.residents as any)?.house_no} • {c.paid_date || "-"}
                    </p>
                  </div>
                  <Badge variant={statusBadge[effectiveStatus] || "outline"} className="text-xs">
                    {t(effectiveStatus)}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="font-medium">₹{Number(c.total_maintenance || 0).toLocaleString("en-IN")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("paid")}</p>
                    <p className="font-medium text-success">₹{Number(c.amount).toLocaleString("en-IN")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("due")}</p>
                    <p className={`font-medium ${Number(c.due_amount) > 0 ? "text-destructive" : ""}`}>
                      ₹{Number(c.due_amount).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
                {c.due_date && (
                  <div className="text-xs text-muted-foreground">
                    {t("due_date")}: {c.due_date}
                  </div>
                )}
                <div className="text-xs text-muted-foreground capitalize">
                  {c.payment_mode?.replace("_", " ") || "-"}
                </div>
                {!readOnly && (
                  <div className="flex gap-1 pt-1 border-t flex-wrap">
                    {Number(c.due_amount) > 0 && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => openDuePayment(c)}>
                              <BanknoteIcon className="h-3.5 w-3.5 text-orange-500" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t("pay_due")}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    {isAdmin && (
                      <Button variant="ghost" size="sm" onClick={() => setHistoryRecordId(c.id)}>
                        <History className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => handleDownloadReceipt(c)}>
                      <FileDown className="h-3.5 w-3.5 text-primary" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => toggleVisibility(c.id, c.is_visible)}>
                      {c.is_visible ? <Eye className="h-3.5 w-3.5 text-success" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                )}
              </SectionCard>
            );
          })
        )}
      </div>

      {/* Desktop table view */}
      <SectionCard className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("resident")}</TableHead>
              <TableHead>{t("house")}</TableHead>
              <TableHead>{t("date")}</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>{t("paid")}</TableHead>
              <TableHead>{t("due")}</TableHead>
              <TableHead>{t("due_date")}</TableHead>
              <TableHead>{t("mode")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              {!readOnly && <TableHead className="text-right">{t("actions")}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={readOnly ? 9 : 10} className="text-center py-8 text-muted-foreground">
                  {t("loading")}
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={readOnly ? 9 : 10} className="text-center py-8 text-muted-foreground">
                  {t("no_records_found")}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((c: any) => {
                const effectiveStatus = getEffectiveStatus(c);
                return (
                  <TableRow key={c.id} className="animate-fade-in">
                    <TableCell className="font-medium">{(c.residents as any)?.name}</TableCell>
                    <TableCell>{(c.residents as any)?.house_no}</TableCell>
                    <TableCell>{c.paid_date || "-"}</TableCell>
                    <TableCell className="font-medium">
                      ₹{Number(c.total_maintenance || 0).toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="text-success font-medium">
                      ₹{Number(c.amount).toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className={Number(c.due_amount) > 0 ? "text-destructive font-medium" : ""}>
                      ₹{Number(c.due_amount).toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell>{c.due_date || "-"}</TableCell>
                    <TableCell className="capitalize">{c.payment_mode?.replace("_", " ") || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={statusBadge[effectiveStatus] || "outline"}>{t(effectiveStatus)}</Badge>
                    </TableCell>
                    {!readOnly && (
                      <TableCell className="text-right space-x-1">
                        {Number(c.due_amount) > 0 && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => openDuePayment(c)}>
                                  <BanknoteIcon className="h-4 w-4 text-orange-500" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{t("pay_due")}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {isAdmin && (
                          <Button variant="ghost" size="icon" onClick={() => setHistoryRecordId(c.id)}>
                            <History className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handleDownloadReceipt(c)}>
                          <FileDown className="h-4 w-4 text-primary" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => toggleVisibility(c.id, c.is_visible)}>
                          {c.is_visible ? (
                            <Eye className="h-4 w-4 text-success" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </SectionCard>
      <AuditHistoryDialog
        open={!!historyRecordId}
        onClose={() => setHistoryRecordId(null)}
        tableName="maintenance_collections"
        recordId={historyRecordId || ""}
      />
      <BulkMaintenanceDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        residents={eligibleResidents}
        defaultAmount={storedDefault}
      />
      <BulkDeleteMaintenanceDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen} collections={filtered} />
      <MaintenanceConflictDialog
        open={!!conflict}
        onOpenChange={(v) => {
          if (!v) onConflictIgnore();
        }}
        reason={conflict}
        onIgnore={onConflictIgnore}
        onContinue={onConflictContinue}
      />
    </div>
  );
};

export default Maintenance;
