export interface Project {
  id: number;
  name: string;
  nombre: string;
  company_id: number | false;
  state: string;
  kms: number;
}

export interface Company {
  id: number;
  name: string;
}

export interface Budget {
  id: number;
  code: string;
  name: string;
  company_id: number | false;
}

export interface Product {
  id: number;
  name: string;
  company_ids: number[];
}

export interface PurchaseOrderLine {
  id: number;
  name: string;
  quantity: number;
  qty_received: number;
  uom: string;
}

export interface PurchaseOrder {
  id: number;
  name: string;
  partner_name: string;
  project_name: string;
  state: string;
  state_label: string;
  date_order: string | false;
  date_planned: string | false;
  lines: PurchaseOrderLine[];
}

export interface SolmatLine {
  id: number;
  note: string;
  product_name: string;
  quantity: number;
}

export interface Solmat {
  id: number;
  name: string;
  date: string | false;
  project_name: string;
  state: "draft" | "requested" | "done";
  state_label: string;
  purchase_order_name: string;
  lines: SolmatLine[];
}

export interface PickingLine {
  id: number;
  name: string;
  quantity: number;
  demand: number;
  uom: string;
}

export interface Picking {
  id: number;
  name: string;
  type: "incoming" | "outgoing";
  type_label: string;
  partner_name: string;
  project_name: string;
  purchase_name: string;
  purchase_partner_name: string;
  origin: string;
  scheduled_date: string | false;
  state: string;
  state_label: string;
  editable: boolean;
  supplier_reference: string;
  line_count: number;
  photo_count: number;
  lines: PickingLine[];
}

export type PickingSummary = Omit<Picking, "lines" | "photo_count">;

export interface PartnerAttendance {
  id: number;
  state: "draft" | "validated" | "invoiced";
  state_label: string;
  partner_name: string;
  partner_parent_name: string;
  project_name: string;
  check_in: string;
  check_out: string;
  hours_of_rest: number;
  tiempo_total_calculado: number;
  editable: boolean;
}

export interface Certification {
  id: number;
  name: string;
  budget_id: number;
  budget_name: string;
  project_name: string;
  stage_name: string;
  stage_date_start: string | false;
  stage_date_stop: string | false;
  state: string;
  state_label: string;
  editable: boolean;
}

export interface CertificationLine {
  id: number;
  chapter: string;
  concept: string;
  budget_qty: number;
  qty_acc: number;
  quantity_to_cert_o: number;
  quantity_to_cert: number;
}

export interface OpenAttendance {
  id: number;
  project: Project;
}

export interface Employee {
  id: number;
  name: string;
  shipment: boolean;
}

export interface Partner {
  id: number;
  name: string;
}

export interface Contract {
  id: number;
  project_id: number;
  project_name: string;
  project_nombre: string;
}

export interface AttendanceRow {
  id: number;
  check_in: string;
  check_out: string;
  project_name: string;
  ud: number;
  entry_type: string;
  exit_type: string;
  note: string;
  t_almuerzo: number;
  t_comida: number;
  total_hh: number;
  mod: number;
  moe: number;
  dietas: number;
  overtime_hours: number;
  diary_part_id: number | false;
  diary_part_name: string;
}

export interface ParteLine {
  concept_name: string;
  product_name: string;
  percentage: number;
  horas_efectivas: number;
  objective_qty: number;
  done_qty: number;
  note: string;
}

export interface Parte {
  id: number;
  name: string;
  datetime: string;
  employee_name: string;
  budget_name: string;
  notes: string;
  lines: ParteLine[];
}

export interface Vehicle {
  id: number;
  name: string;
  odometer: number;
  parked_in_workshop: boolean;
}

export interface LeaveRow {
  id: number;
  date_from: string;
  date_to: string;
  days: number;
  state: string;
  state_label: string;
  description: string;
}

export interface CalendarDay {
  day: number;
  ds?: string;
  type_id?: number;
  state?: string;
  holiday?: boolean;
  today?: boolean;
  weekend?: boolean;
}

export interface CalendarMonth {
  num: number;
  name: string;
  weeks: CalendarDay[][];
}

export interface LeaveTypeInfo {
  name: string;
  color: string;
}

export interface ImputarPartidaLine {
  id: number;
  datetime: string | false;
  employee_name: string;
  budget_id: number | false;
  budget_name: string;
  concept_name: string;
  product_id: number | false;
  product_name: string;
  percentage: number;
  horas: number;
}

export interface ConceptNode {
  id: number | null;
  code: string;
  name: string;
  type: "chapter" | "departure";
  children: ConceptNode[];
}

export interface LineInput {
  product_id: number;
  percentage: number;
  done_qty: number;
}
