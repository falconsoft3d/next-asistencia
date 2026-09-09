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
