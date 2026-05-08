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
  ChevronDown,
  ChevronRight,
  CalendarRange,
  UserCog,
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
import { downloadReceipt, downloadStatement } from "@/utils/generateReceipt";
import { triggerPush } from "@/lib/triggerPush";
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

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const fyForDate = (d: Date) => {
  const m = d.getMonth();
  const y = d.getFullYear();
  return m >= 3 ? y : y - 1;
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
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const queryClient = useQueryClient();

  useEffect(() => {
    void (async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "supervisor");
      const userIds = (roles || []).map((r: any) => r.user_id);
      if (userIds.length === 0) { setSupervisorResidentIds([]); return; }
      const { data: profs } = await supabase.from("profiles").select("resident_id").in("user_id", userIds);
      setSupervisorResidentIds((profs || []).map((p: any) => p.resident_id).filter(Boolean));
    })();
  }, []);

  const [search, setSearch] = useState("");
  const [searchParams] = useSearchParams();
  const initialFilter = searchParams.get("filter");
  const [filterStatus, setFilterStatus] = useState(
    initialFilter && ["paid","pending","partial","overdue"].includes(initialFilter) ? initialFilter : "all"
  );
  useEffect(() => {
    const f = searchParams.get("filter");
    if (f && ["paid","pending","partial","overdue"].includes(f)) setFilterStatus(f);
  }, [searchParams]);
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterYear, setFilterYear] = useState<string>(String(fyForDate(new Date())));

  const [storedDefault, setStoredDefault] = useState(getStoredDefault);
  const [defaultAmountDialog, setDefaultAmountDialog] = useState(false);
  const [defaultAmount, setDefaultAmount] = useState(String(storedDefault));

  // Add new parent (FY entry)
  const [addParentOpen, setAddParentOpen] = useState(false);
  const [addParentForm, setAddParentForm] = useState({ residentId: "", year: String(fyForDate(new Date())), totalMaintenance: String(storedDefault) });

  // Edit parent (master admin can also reassign resident)
  const [editParent, setEditParent] = useState<any>(null);
  const [editParentTotal, setEditParentTotal] = useState("");
  const [editParentResidentId, setEditParentResidentId] = useState("");
  const [editParentYear, setEditParentYear] = useState("");

  // Edit child payment
  const [editChild, setEditChild] = useState<any>(null);
  const [editChildForm, setEditChildForm] = useState({ amount: "", date: "", paymentMode: "upi" });

  // Pay due dialog (parent)
  const [duePaymentDialog, setDuePaymentDialog] = useState(false);
  const [duePaymentParent, setDuePaymentParent] = useState<any>(null);
  const [duePaymentForm, setDuePaymentForm] = useState({ amount: "", date: new Date().toISOString().split("T")[0], paymentMode: "upi" });

  const [historyRecordId, setHistoryRecordId] = useState<string | null>(null);
  const readOnly = isResident || isCoordinator;

  // Group collections: parents (parent_id null) + children attached
  const groups = useMemo(() => {
    const parents: any[] = [];
    const childrenByParent: Record<string, any[]> = {};
    for (const c of collections as any[]) {
      if (supervisorResidentIds.includes(c.resident_id)) continue;
      if (c.parent_id) {
        (childrenByParent[c.parent_id] ||= []).push(c);
      } else {
        parents.push(c);
      }
    }
    Object.values(childrenByParent).forEach(arr => arr.sort((a,b)=>(b.paid_date||"").localeCompare(a.paid_date||"")));
    parents.sort((a,b)=> (b.year||0)-(a.year||0) || ((a.residents as any)?.name||"").localeCompare((b.residents as any)?.name||""));
    return { parents, childrenByParent };
  }, [collections, supervisorResidentIds]);

  const availableYears = useMemo(() => {
    const set = new Set<number>();
    for (const p of groups.parents) if (p.year) set.add(Number(p.year));
    set.add(fyForDate(new Date()));
    return Array.from(set).sort((a,b)=>b-a);
  }, [groups]);

  const isFilterActive = filterStatus !== "all" || filterMonth !== "all" || search.trim() !== "";

  // Filtered parent list (default view) — filtered by year too
  const filteredParents = useMemo(() => {
    return groups.parents.filter((p: any) => {
      const name = (p.residents as any)?.name || "";
      const houseNo = (p.residents as any)?.house_no || "";
      const matchSearch = name.toLowerCase().includes(search.toLowerCase()) || houseNo.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === "all" || p.status === filterStatus;
      const matchYear = String(p.year) === filterYear;
      return matchSearch && matchStatus && matchYear;
    });
  }, [groups, search, filterStatus, filterYear]);

  // Flat children list (when month/status filter is active) — restricted to selected FY's parents
  const filteredChildren = useMemo(() => {
    const allChildren: any[] = [];
    for (const p of groups.parents) {
      if (String(p.year) !== filterYear) continue;
      const kids = groups.childrenByParent[p.id] || [];
      for (const k of kids) {
        allChildren.push({ ...k, residents: p.residents, _parent: p });
      }
    }
    return allChildren.filter((c: any) => {
      const name = (c.residents as any)?.name || "";
      const houseNo = (c.residents as any)?.house_no || "";
      const matchSearch = name.toLowerCase().includes(search.toLowerCase()) || houseNo.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === "all" || c.status === filterStatus;
      const matchMonth = filterMonth === "all" || c.month === filterMonth;
      return matchSearch && matchStatus && matchMonth;
    }).sort((a,b)=>(b.paid_date||"").localeCompare(a.paid_date||""));
  }, [groups, search, filterStatus, filterMonth, filterYear]);

  const totalCollected = groups.parents.reduce((s, p:any) => {
    const kids = groups.childrenByParent[p.id] || [];
    return s + kids.reduce((ss:number, k:any)=> ss + Number(k.amount||0), 0);
  }, 0);
  const totalPending = groups.parents.reduce((s, p:any)=> s + Number(p.due_amount||0), 0);
  const paidCount = groups.parents.filter(p=>p.status==="paid").length;
  const overdueCount = groups.parents.filter(p=> Number(p.due_amount||0) > 0).length;

  const eligibleResidents = useMemo(
    () => residents.filter((r: any) => !supervisorResidentIds.includes(r.id)),
    [residents, supervisorResidentIds],
  );

  // ---------- Actions ----------
  const handleAddParent = async () => {
    if (!addParentForm.residentId || !addParentForm.totalMaintenance) {
      toast.error(t("please_fill_required"));
      return;
    }
    const year = Number(addParentForm.year);
    const total = Number(addParentForm.totalMaintenance);
    // Check duplicate
    const dup = groups.parents.find(p=>p.resident_id===addParentForm.residentId && p.year===year);
    if (dup) { toast.error("Annual entry already exists for this resident & FY"); return; }
    const { error } = await supabase.from("maintenance_collections").insert({
      resident_id: addParentForm.residentId,
      total_maintenance: total,
      amount: 0,
      due_amount: total,
      month: "Annual",
      year,
      status: "pending",
      parent_id: null,
    });
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["maintenance_collections"] });
    setAddParentOpen(false);
    toast.success(t("payment_recorded"));
  };

  const handleEditParent = async () => {
    if (!editParent) return;
    const newTotal = Number(editParentTotal);
    if (!newTotal || newTotal < 0) { toast.error(t("please_fill_required")); return; }
    const newResidentId = editParentResidentId || editParent.resident_id;
    const newYear = Number(editParentYear) || editParent.year;

    // If resident or year changed, ensure no duplicate target parent
    if (newResidentId !== editParent.resident_id || newYear !== editParent.year) {
      const dup = groups.parents.find(p => p.id !== editParent.id && p.resident_id === newResidentId && Number(p.year) === newYear);
      if (dup) { toast.error("Annual entry already exists for selected resident & FY"); return; }
    }

    const { error } = await supabase.from("maintenance_collections").update({
      total_maintenance: newTotal,
      resident_id: newResidentId,
      year: newYear,
    }).eq("id", editParent.id);
    if (error) { toast.error(error.message); return; }

    // Cascade resident_id/year to all children — keeps drop-down membership consistent
    if (newResidentId !== editParent.resident_id || newYear !== editParent.year) {
      await supabase.from("maintenance_collections")
        .update({ resident_id: newResidentId })
        .eq("parent_id", editParent.id);
    }

    queryClient.invalidateQueries({ queryKey: ["maintenance_collections"] });
    setEditParent(null);
    toast.success(t("amount_updated") || "Updated");
  };

  const handleEditChild = async () => {
    if (!editChild) return;
    const amt = Number(editChildForm.amount);
    const dateObj = new Date(editChildForm.date);
    const { error } = await supabase.from("maintenance_collections").update({
      amount: amt,
      paid_date: editChildForm.date,
      month: MONTHS[dateObj.getMonth()],
      year: dateObj.getFullYear(),
      payment_mode: editChildForm.paymentMode,
    }).eq("id", editChild.id);
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["maintenance_collections"] });
    setEditChild(null);
    toast.success(t("update") || "Updated");
  };

  const openDuePayment = (parent: any) => {
    setDuePaymentParent(parent);
    setDuePaymentForm({ amount: String(parent.due_amount), date: new Date().toISOString().split("T")[0], paymentMode: "upi" });
    setDuePaymentDialog(true);
  };

  const handleDuePayment = async () => {
    if (!duePaymentParent || !duePaymentForm.amount) { toast.error(t("please_fill_required")); return; }
    const payAmount = Number(duePaymentForm.amount);
    const dateObj = new Date(duePaymentForm.date);
    const totalMaint = Number(duePaymentParent.total_maintenance);
    // Existing children sum
    const kids = groups.childrenByParent[duePaymentParent.id] || [];
    const alreadyPaid = kids.reduce((s:number,k:any)=> s+Number(k.amount||0),0);
    const remainingDue = Math.max(0, totalMaint - (alreadyPaid + payAmount));
    const status = remainingDue <= 0 ? "paid" : "partial";

    const { error } = await supabase.from("maintenance_collections").insert({
      parent_id: duePaymentParent.id,
      resident_id: duePaymentParent.resident_id,
      amount: payAmount,
      due_amount: remainingDue,
      total_maintenance: totalMaint,
      paid_date: duePaymentForm.date,
      month: MONTHS[dateObj.getMonth()],
      year: dateObj.getFullYear(),
      status,
      payment_mode: duePaymentForm.paymentMode,
    });
    if (error) { toast.error(error.message); return; }
    void triggerPush({
      title: "Maintenance payment recorded",
      body: `Payment of INR ${payAmount} recorded`,
      url: "/maintenance",
      tag: `maint-${duePaymentParent.resident_id}`,
      audience: { kind: "residents", residentIds: [duePaymentParent.resident_id] },
      excludeUserId: user?.id,
    });
    queryClient.invalidateQueries({ queryKey: ["maintenance_collections"] });
    setDuePaymentDialog(false);
    setExpanded(p => ({ ...p, [duePaymentParent.id]: true }));
    toast.success(t("due_payment_recorded") || "Payment recorded");
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("confirm_delete"))) return;
    const { error } = await supabase.from("maintenance_collections").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["maintenance_collections"] });
    toast.success(t("delete"));
  };

  const toggleVisibility = async (id: string, current: boolean) => {
    const { error } = await supabase.from("maintenance_collections").update({ is_visible: !current }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["maintenance_collections"] });
    toast.success(t("visibility_updated"));
  };

  const handleUpdateDefaultAmount = async () => {
    const newAmt = Number(defaultAmount);
    if (!newAmt || newAmt <= 0) { toast.error(t("please_fill_required")); return; }
    localStorage.setItem(STORAGE_KEY, String(newAmt));
    setStoredDefault(newAmt);
    setDefaultAmountDialog(false);
    toast.success(t("amount_updated"));
  };

  // CSV: per-row export — child rows must reflect PARENT FY totals, not stale per-row snapshots
  const downloadCSV = () => {
    const rowsSrc: any[] = isFilterActive
      ? filteredChildren
      : groups.parents
          .filter((p:any)=> String(p.year) === filterYear)
          .flatMap((p:any) => (groups.childrenByParent[p.id]||[]).map((k:any)=>({...k, residents:p.residents, _parent:p})));
    const headers = [t("resident"), t("house"), t("date"), "Total", t("paid"), t("due"), t("mode"), t("status")];
    const rows = rowsSrc.map((c: any) => {
      const parent = c._parent || groups.parents.find((p:any)=>p.id===c.parent_id) || c;
      return [
        (c.residents as any)?.name || "",
        (c.residents as any)?.house_no || "",
        c.paid_date || "",
        Number(parent.total_maintenance || 0),
        Number(c.amount || 0),
        Number(parent.due_amount || 0),
        c.payment_mode || "",
        parent.status || c.status,
      ];
    });
    const csv = [headers, ...rows]
      .map((r) => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "maintenance_funds.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadChildReceipt = async (c: any) => {
    const { data: receipt } = await supabase.from("maintenance_receipts").select("*").eq("maintenance_collection_id", c.id).maybeSingle();
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

  const handleDownloadParentStatement = (parent: any) => {
    const kids = (groups.childrenByParent[parent.id] || []).slice().sort((a,b)=>(a.paid_date||"").localeCompare(b.paid_date||""));
    let runningPaid = 0;
    const total = Number(parent.total_maintenance || 0);
    const children = kids.map((k:any)=> {
      runningPaid += Number(k.amount||0);
      return {
        date: k.paid_date || "-",
        amountPaid: Number(k.amount||0),
        dueAfter: Math.max(0, total - runningPaid),
        paymentMode: k.payment_mode,
      };
    });
    downloadStatement({
      societyName: "Shri Vidhya Niwas Society",
      residentName: (parent.residents as any)?.name || "",
      houseNo: (parent.residents as any)?.house_no || "",
      laneNo: (parent.residents as any)?.lane_no || "",
      year: parent.year,
      totalMaintenance: total,
      totalPaid: runningPaid,
      totalDue: Number(parent.due_amount || 0),
      children,
    });
  };

  // ---------- Render ----------
  const renderParentRowMobile = (p: any) => {
    const kids = groups.childrenByParent[p.id] || [];
    const isOpen = !!expanded[p.id];
    return (
      <SectionCard key={p.id} className="py-3 space-y-2">
        <div className="flex items-center justify-between cursor-pointer" onClick={()=>setExpanded(s=>({...s,[p.id]:!s[p.id]}))}>
          <div className="flex items-center gap-2 min-w-0">
            {isOpen ? <ChevronDown className="h-4 w-4 shrink-0"/> : <ChevronRight className="h-4 w-4 shrink-0"/>}
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{(p.residents as any)?.name}</p>
              <p className="text-xs text-muted-foreground">{(p.residents as any)?.house_no} • FY {p.year}-{String((p.year+1)%100).padStart(2,"0")}</p>
            </div>
          </div>
          <Badge variant={statusBadge[p.status] || "outline"} className="text-xs">{t(p.status)}</Badge>
        </div>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div><p className="text-xs text-muted-foreground">{t("total")}</p><p className="font-medium">₹{Number(p.total_maintenance).toLocaleString("en-IN")}</p></div>
          <div><p className="text-xs text-muted-foreground">{t("paid")}</p><p className="font-medium text-success">₹{(Number(p.total_maintenance) - Number(p.due_amount)).toLocaleString("en-IN")}</p></div>
          <div><p className="text-xs text-muted-foreground">{t("due")}</p><p className={`font-medium ${Number(p.due_amount) > 0 ? "text-destructive" : ""}`}>₹{Number(p.due_amount).toLocaleString("en-IN")}</p></div>
        </div>
        {!readOnly && (
          <div className="flex gap-1 pt-1 border-t flex-wrap">
            {Number(p.due_amount) > 0 && (
              <Button variant="ghost" size="sm" onClick={()=>openDuePayment(p)}><BanknoteIcon className="h-3.5 w-3.5 text-orange-500 mr-1"/>{t("pay_due")}</Button>
            )}
            <Button variant="ghost" size="sm" onClick={()=>handleDownloadParentStatement(p)}><FileDown className="h-3.5 w-3.5 text-primary"/></Button>
            {isMasterAdmin && <Button variant="ghost" size="sm" onClick={()=>{setEditParent(p); setEditParentTotal(String(p.total_maintenance)); setEditParentResidentId(p.resident_id); setEditParentYear(String(p.year));}}><Edit2 className="h-3.5 w-3.5"/></Button>}
            {isAdmin && <Button variant="ghost" size="sm" onClick={()=>setHistoryRecordId(p.id)}><History className="h-3.5 w-3.5 text-muted-foreground"/></Button>}
            {isMasterAdmin && <Button variant="ghost" size="sm" onClick={()=>handleDelete(p.id)}><Trash2 className="h-3.5 w-3.5 text-destructive"/></Button>}
          </div>
        )}
        {isOpen && kids.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            {kids.map((k:any)=>(
              <div key={k.id} className="rounded-lg bg-muted/40 p-2 text-xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{k.paid_date}</span>
                  <span className="text-success font-semibold">₹{Number(k.amount).toLocaleString("en-IN")}</span>
                </div>
                <div className="text-muted-foreground capitalize">{(k.payment_mode||"-").replace(/_/g," ")}</div>
                {!readOnly && (
                  <div className="flex gap-1 pt-1">
                    <Button variant="ghost" size="sm" className="h-6 px-1.5" onClick={()=>handleDownloadChildReceipt(k)}><FileDown className="h-3 w-3 text-primary"/></Button>
                    <Button variant="ghost" size="sm" className="h-6 px-1.5" onClick={()=>toggleVisibility(k.id, k.is_visible)}>{k.is_visible ? <Eye className="h-3 w-3 text-success"/> : <EyeOff className="h-3 w-3"/>}</Button>
                    <Button variant="ghost" size="sm" className="h-6 px-1.5" onClick={()=>{setEditChild(k); setEditChildForm({amount:String(k.amount), date:k.paid_date||"", paymentMode:k.payment_mode||"upi"});}}><Edit2 className="h-3 w-3"/></Button>
                    {isAdmin && <Button variant="ghost" size="sm" className="h-6 px-1.5" onClick={()=>setHistoryRecordId(k.id)}><History className="h-3 w-3 text-muted-foreground"/></Button>}
                    <Button variant="ghost" size="sm" className="h-6 px-1.5" onClick={()=>handleDelete(k.id)}><Trash2 className="h-3 w-3 text-destructive"/></Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    );
  };

  const renderChildCardMobile = (c: any) => (
    <SectionCard key={c.id} className="py-3 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-sm">{(c.residents as any)?.name}</p>
          <p className="text-xs text-muted-foreground">{(c.residents as any)?.house_no} • {c.paid_date}</p>
        </div>
        <span className="text-success font-semibold">₹{Number(c.amount).toLocaleString("en-IN")}</span>
      </div>
      <div className="text-xs text-muted-foreground capitalize">{(c.payment_mode||"-").replace(/_/g," ")}</div>
      {!readOnly && (
        <div className="flex gap-1 pt-1 border-t">
          <Button variant="ghost" size="sm" onClick={()=>handleDownloadChildReceipt(c)}><FileDown className="h-3.5 w-3.5 text-primary"/></Button>
          <Button variant="ghost" size="sm" onClick={()=>toggleVisibility(c.id, c.is_visible)}>{c.is_visible ? <Eye className="h-3.5 w-3.5 text-success"/> : <EyeOff className="h-3.5 w-3.5"/>}</Button>
          <Button variant="ghost" size="sm" onClick={()=>{setEditChild(c); setEditChildForm({amount:String(c.amount), date:c.paid_date||"", paymentMode:c.payment_mode||"upi"});}}><Edit2 className="h-3.5 w-3.5"/></Button>
          <Button variant="ghost" size="sm" onClick={()=>handleDelete(c.id)}><Trash2 className="h-3.5 w-3.5 text-destructive"/></Button>
        </div>
      )}
    </SectionCard>
  );

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
                <Download className="h-3.5 w-3.5 mr-1"/> CSV
              </Button>
            )}
            {!readOnly && (
              <>
                {isMasterAdmin && (
                  <Button variant="outline" size="sm" onClick={()=>{setDefaultAmount(String(storedDefault)); setDefaultAmountDialog(true);}} className="h-8 px-2.5 text-xs shrink-0">
                    <Settings2 className="h-3.5 w-3.5 mr-1"/> {t("amount")}
                  </Button>
                )}
                {canBulk && (
                  <>
                    <Button variant="outline" size="sm" onClick={()=>setBulkOpen(true)} className="h-8 px-2.5 text-xs shrink-0">
                      <Layers className="h-3.5 w-3.5 mr-1"/> Bulk
                    </Button>
                    <Button variant="outline" size="sm" onClick={()=>setBulkDeleteOpen(true)} className="h-8 px-2.5 text-xs shrink-0 text-destructive hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5 mr-1"/> Del
                    </Button>
                  </>
                )}
                <Button onClick={()=>{setAddParentForm({residentId:"", year:String(fyForDate(new Date())), totalMaintenance:String(storedDefault)}); setAddParentOpen(true);}} size="sm" className="h-8 px-2.5 text-xs shrink-0">
                  <Plus className="h-3.5 w-3.5 mr-1"/> {t("add")}
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <StatCard title={t("total_collected")} value={`₹${totalCollected.toLocaleString("en-IN")}`} icon={IndianRupee} variant="success"/>
        <StatCard title={t("pending_dues")} value={`₹${totalPending.toLocaleString("en-IN")}`} icon={AlertTriangle} variant="warning"/>
        <StatCard title={t("paid")} value={String(paidCount)} icon={CheckCircle2} variant="primary"/>
        <StatCard title={t("overdue")} value={String(overdueCount)} icon={Clock} variant="destructive"/>
      </div>

      {/* Filters */}
      <SectionCard className="py-3 md:py-3">
        <div className="flex flex-col gap-2">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
            <Input className="pl-10 h-9" placeholder={t("search_residents")} value={search} onChange={(e)=>setSearch(e.target.value)}/>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger className="h-9 w-full"><CalendarRange className="h-4 w-4 mr-1 shrink-0"/><SelectValue/></SelectTrigger>
              <SelectContent>
                {availableYears.map((y) => (
                  <SelectItem key={y} value={String(y)}>FY {y}-{String((y+1)%100).padStart(2,"0")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="h-9 w-full"><SelectValue/></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("all_months")}</SelectItem>
                {MONTHS.map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-9 w-full"><Filter className="h-4 w-4 mr-1 shrink-0"/><SelectValue/></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("all_status")}</SelectItem>
              <SelectItem value="paid">{t("paid")}</SelectItem>
              <SelectItem value="partial">{t("partial")}</SelectItem>
              <SelectItem value="pending">{t("pending")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {filterMonth !== "all" && (
          <p className="text-xs text-muted-foreground mt-2">Showing payment records (sub-entries) across all residents.</p>
        )}
      </SectionCard>

      {/* Mobile view */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">{t("loading")}</p>
        ) : isFilterActive && filterMonth !== "all" ? (
          filteredChildren.length === 0
            ? <SectionCard className="p-8 text-center text-muted-foreground">{t("no_records_found")}</SectionCard>
            : filteredChildren.map(renderChildCardMobile)
        ) : (
          filteredParents.length === 0
            ? <SectionCard className="p-8 text-center text-muted-foreground">{t("no_records_found")}</SectionCard>
            : filteredParents.map(renderParentRowMobile)
        )}
      </div>

      {/* Desktop table */}
      <SectionCard className="hidden md:block overflow-x-auto">
        {isFilterActive && filterMonth !== "all" ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("resident")}</TableHead>
                <TableHead>{t("house")}</TableHead>
                <TableHead>{t("date")}</TableHead>
                <TableHead>{t("paid")}</TableHead>
                <TableHead>{t("mode")}</TableHead>
                {!readOnly && <TableHead className="text-right">{t("actions")}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredChildren.length === 0 ? (
                <TableRow><TableCell colSpan={readOnly?5:6} className="text-center py-8 text-muted-foreground">{t("no_records_found")}</TableCell></TableRow>
              ) : filteredChildren.map((c:any)=>(
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{(c.residents as any)?.name}</TableCell>
                  <TableCell>{(c.residents as any)?.house_no}</TableCell>
                  <TableCell>{c.paid_date}</TableCell>
                  <TableCell className="text-success font-medium">₹{Number(c.amount).toLocaleString("en-IN")}</TableCell>
                  <TableCell className="capitalize">{(c.payment_mode||"-").replace(/_/g," ")}</TableCell>
                  {!readOnly && (
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={()=>handleDownloadChildReceipt(c)}><FileDown className="h-4 w-4 text-primary"/></Button>
                      <Button variant="ghost" size="icon" onClick={()=>toggleVisibility(c.id, c.is_visible)}>{c.is_visible ? <Eye className="h-4 w-4 text-success"/> : <EyeOff className="h-4 w-4 text-muted-foreground"/>}</Button>
                      <Button variant="ghost" size="icon" onClick={()=>{setEditChild(c); setEditChildForm({amount:String(c.amount), date:c.paid_date||"", paymentMode:c.payment_mode||"upi"});}}><Edit2 className="h-4 w-4"/></Button>
                      <Button variant="ghost" size="icon" onClick={()=>handleDelete(c.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>{t("resident")}</TableHead>
                <TableHead>{t("house")}</TableHead>
                <TableHead>FY</TableHead>
                <TableHead>{t("total")}</TableHead>
                <TableHead>{t("paid")}</TableHead>
                <TableHead>{t("due")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                {!readOnly && <TableHead className="text-right">{t("actions")}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={readOnly?8:9} className="text-center py-8 text-muted-foreground">{t("loading")}</TableCell></TableRow>
              ) : filteredParents.length === 0 ? (
                <TableRow><TableCell colSpan={readOnly?8:9} className="text-center py-8 text-muted-foreground">{t("no_records_found")}</TableCell></TableRow>
              ) : filteredParents.map((p:any)=>{
                const kids = groups.childrenByParent[p.id] || [];
                const isOpen = !!expanded[p.id];
                const paidSoFar = Number(p.total_maintenance) - Number(p.due_amount);
                return (
                  <>
                    <TableRow key={p.id} className="cursor-pointer hover:bg-muted/30" onClick={()=>setExpanded(s=>({...s,[p.id]:!s[p.id]}))}>
                      <TableCell>{isOpen ? <ChevronDown className="h-4 w-4"/> : <ChevronRight className="h-4 w-4"/>}</TableCell>
                      <TableCell className="font-medium">{(p.residents as any)?.name}</TableCell>
                      <TableCell>{(p.residents as any)?.house_no}</TableCell>
                      <TableCell>FY {p.year}-{String((p.year+1)%100).padStart(2,"0")}</TableCell>
                      <TableCell>₹{Number(p.total_maintenance).toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-success font-medium">₹{paidSoFar.toLocaleString("en-IN")}</TableCell>
                      <TableCell className={Number(p.due_amount)>0?"text-destructive font-medium":""}>₹{Number(p.due_amount).toLocaleString("en-IN")}</TableCell>
                      <TableCell><Badge variant={statusBadge[p.status]||"outline"}>{t(p.status)}</Badge></TableCell>
                      {!readOnly && (
                        <TableCell className="text-right space-x-1" onClick={(e)=>e.stopPropagation()}>
                          {Number(p.due_amount) > 0 && (
                            <TooltipProvider><Tooltip><TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={()=>openDuePayment(p)}><BanknoteIcon className="h-4 w-4 text-orange-500"/></Button>
                            </TooltipTrigger><TooltipContent>{t("pay_due")}</TooltipContent></Tooltip></TooltipProvider>
                          )}
                          <TooltipProvider><Tooltip><TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={()=>handleDownloadParentStatement(p)}><FileDown className="h-4 w-4 text-primary"/></Button>
                          </TooltipTrigger><TooltipContent>FY Statement PDF</TooltipContent></Tooltip></TooltipProvider>
                          {isMasterAdmin && <Button variant="ghost" size="icon" onClick={()=>{setEditParent(p); setEditParentTotal(String(p.total_maintenance)); setEditParentResidentId(p.resident_id); setEditParentYear(String(p.year));}}><Edit2 className="h-4 w-4"/></Button>}
                          {isAdmin && <Button variant="ghost" size="icon" onClick={()=>setHistoryRecordId(p.id)}><History className="h-4 w-4 text-muted-foreground"/></Button>}
                          {isMasterAdmin && <Button variant="ghost" size="icon" onClick={()=>handleDelete(p.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button>}
                        </TableCell>
                      )}
                    </TableRow>
                    {isOpen && kids.map((k:any)=>(
                      <TableRow key={k.id} className="bg-muted/30">
                        <TableCell></TableCell>
                        <TableCell colSpan={2} className="text-xs text-muted-foreground pl-8">↳ Payment</TableCell>
                        <TableCell className="text-xs">{k.paid_date}</TableCell>
                        <TableCell></TableCell>
                        <TableCell className="text-success text-sm">₹{Number(k.amount).toLocaleString("en-IN")}</TableCell>
                        <TableCell></TableCell>
                        <TableCell className="text-xs capitalize">{(k.payment_mode||"-").replace(/_/g," ")}</TableCell>
                        {!readOnly && (
                          <TableCell className="text-right space-x-1">
                            <Button variant="ghost" size="icon" onClick={()=>handleDownloadChildReceipt(k)}><FileDown className="h-4 w-4 text-primary"/></Button>
                            <Button variant="ghost" size="icon" onClick={()=>toggleVisibility(k.id, k.is_visible)}>{k.is_visible ? <Eye className="h-4 w-4 text-success"/> : <EyeOff className="h-4 w-4 text-muted-foreground"/>}</Button>
                            <Button variant="ghost" size="icon" onClick={()=>{setEditChild(k); setEditChildForm({amount:String(k.amount), date:k.paid_date||"", paymentMode:k.payment_mode||"upi"});}}><Edit2 className="h-4 w-4"/></Button>
                            {isAdmin && <Button variant="ghost" size="icon" onClick={()=>setHistoryRecordId(k.id)}><History className="h-4 w-4 text-muted-foreground"/></Button>}
                            <Button variant="ghost" size="icon" onClick={()=>handleDelete(k.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                    {isOpen && kids.length === 0 && (
                      <TableRow className="bg-muted/30"><TableCell></TableCell><TableCell colSpan={readOnly?7:8} className="text-xs text-muted-foreground pl-8">No payments yet.</TableCell></TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>
        )}
      </SectionCard>

      {/* Add parent dialog */}
      <Dialog open={addParentOpen} onOpenChange={setAddParentOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-display">New Annual Entry</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>{t("resident")} *</Label>
              <Select value={addParentForm.residentId} onValueChange={(v)=>setAddParentForm({...addParentForm, residentId:v})}>
                <SelectTrigger><SelectValue placeholder={t("select_resident")}/></SelectTrigger>
                <SelectContent>{eligibleResidents.map((r:any)=>(<SelectItem key={r.id} value={r.id}>{r.name} ({r.house_no})</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>FY Start Year *</Label><Input type="number" value={addParentForm.year} onChange={(e)=>setAddParentForm({...addParentForm, year:e.target.value})}/></div>
              <div className="grid gap-2"><Label>{t("total_maintenance")} (₹) *</Label><Input type="number" value={addParentForm.totalMaintenance} onChange={(e)=>setAddParentForm({...addParentForm, totalMaintenance:e.target.value})}/></div>
            </div>
            <Button onClick={handleAddParent} className="w-full">Create</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit parent (master admin: reassign resident, change FY year, edit total) */}
      <Dialog open={!!editParent} onOpenChange={(v)=>{if(!v)setEditParent(null);}}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-display">Edit Annual Entry</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label className="flex items-center gap-1"><UserCog className="h-3.5 w-3.5"/> {t("resident")} *</Label>
              <Select value={editParentResidentId} onValueChange={setEditParentResidentId}>
                <SelectTrigger><SelectValue placeholder={t("select_resident")}/></SelectTrigger>
                <SelectContent>{eligibleResidents.map((r:any)=>(<SelectItem key={r.id} value={r.id}>{r.name} ({r.house_no})</SelectItem>))}</SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Changing resident moves all sub-entries to the new resident.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>FY Start Year *</Label><Input type="number" value={editParentYear} onChange={(e)=>setEditParentYear(e.target.value)}/></div>
              <div className="grid gap-2"><Label>{t("total_maintenance")} (₹) *</Label><Input type="number" value={editParentTotal} onChange={(e)=>setEditParentTotal(e.target.value)}/></div>
            </div>
            <Button onClick={handleEditParent} className="w-full">{t("update")}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit child payment */}
      <Dialog open={!!editChild} onOpenChange={(v)=>{if(!v)setEditChild(null);}}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="font-display">Edit Payment</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2"><Label>{t("paid")} (₹) *</Label><Input type="number" value={editChildForm.amount} onChange={(e)=>setEditChildForm({...editChildForm, amount:e.target.value})}/></div>
            <div className="grid gap-2"><Label>{t("date")} *</Label><Input type="date" value={editChildForm.date} onChange={(e)=>setEditChildForm({...editChildForm, date:e.target.value})}/></div>
            <div className="grid gap-2"><Label>{t("payment_mode")}</Label>
              <Select value={editChildForm.paymentMode} onValueChange={(v)=>setEditChildForm({...editChildForm, paymentMode:v})}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{t("cash")}</SelectItem>
                  <SelectItem value="upi">{t("upi")}</SelectItem>
                  <SelectItem value="bank_transfer">{t("bank_transfer")}</SelectItem>
                  <SelectItem value="cheque">{t("cheque")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleEditChild} className="w-full">{t("update")}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pay due dialog */}
      <Dialog open={duePaymentDialog} onOpenChange={setDuePaymentDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="font-display">{t("pay_due")}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            {duePaymentParent && (
              <div className="p-3 rounded-lg bg-muted text-sm">
                <p><span className="text-muted-foreground">{t("resident")}:</span> {(duePaymentParent.residents as any)?.name}</p>
                <p><span className="text-muted-foreground">{t("due")}:</span> <span className="font-bold text-destructive">₹{Number(duePaymentParent.due_amount).toLocaleString("en-IN")}</span></p>
              </div>
            )}
            <div className="grid gap-2"><Label>{t("amount")} (₹) *</Label><Input type="number" value={duePaymentForm.amount} onChange={(e)=>setDuePaymentForm({...duePaymentForm, amount:e.target.value})}/></div>
            <div className="grid gap-2"><Label>{t("date")} *</Label><Input type="date" value={duePaymentForm.date} onChange={(e)=>setDuePaymentForm({...duePaymentForm, date:e.target.value})}/></div>
            <div className="grid gap-2"><Label>{t("payment_mode")}</Label>
              <Select value={duePaymentForm.paymentMode} onValueChange={(v)=>setDuePaymentForm({...duePaymentForm, paymentMode:v})}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{t("cash")}</SelectItem>
                  <SelectItem value="upi">{t("upi")}</SelectItem>
                  <SelectItem value="bank_transfer">{t("bank_transfer")}</SelectItem>
                  <SelectItem value="cheque">{t("cheque")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleDuePayment} className="w-full gradient-warm text-primary-foreground">{t("pay_due")}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Default amount dialog */}
      <Dialog open={defaultAmountDialog} onOpenChange={setDefaultAmountDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="font-display">{t("set_default_amount")}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>{t("total_maintenance")} (₹)</Label>
              <Input type="number" value={defaultAmount} onChange={(e)=>setDefaultAmount(e.target.value)}/>
              <p className="text-xs text-muted-foreground">{t("default_amount_note")}</p>
            </div>
            <Button onClick={handleUpdateDefaultAmount} className="w-full gradient-warm text-primary-foreground">{t("update")}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AuditHistoryDialog open={!!historyRecordId} onClose={()=>setHistoryRecordId(null)} tableName="maintenance_collections" recordId={historyRecordId || ""}/>
      <BulkMaintenanceDialog open={bulkOpen} onOpenChange={setBulkOpen} residents={eligibleResidents} defaultAmount={storedDefault}/>
      <BulkDeleteMaintenanceDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen} collections={groups.parents}/>
    </div>
  );
};

export default Maintenance;
