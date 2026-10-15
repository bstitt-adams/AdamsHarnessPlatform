import { validateModuleDefinition } from "@/lib/modules/contract";

export const VEHICLE_INSPECTION_DEPARTMENT_ID = "mission-critical-safety-fixture";

export const VEHICLE_INSPECTION_SPEC_FIXTURE = {
  title: "Six-Month Vehicle Inspection Program",
  version: 1,
  status: "approved" as const,
  sections: {
    summary:
      "Drivers complete a documented vehicle inspection every six months. The system schedules each inspection from the vehicle's next-inspection due date, captures photo evidence and checklist answers, collects an employee signature, and escalates overdue inspections to the driver's supervisor.",
    futureProcess:
      "A schedule workflow on each vehicle's next_inspection_due date creates a vehicle_inspection record pre-filled with the vehicle, VIN, plate, driver, and supervisor, then notifies the assigned driver. The driver submits the six_month_vehicle_inspection form with exterior/interior photos, checklist confirmations, issues, severity, and signature. If an inspection remains active seven days past its due date, the supervisor is escalated automatically.",
    dataEntities: [
      { name: "vehicle", description: "A fleet vehicle with assigned driver, supervisor, VIN, plate, and next inspection due date." },
      { name: "vehicle_inspection", description: "One inspection cycle for a vehicle, including photos, checklist results, issues, severity, and signature." },
    ],
    forms: [
      { name: "vehicle_setup", description: "Register a vehicle and its next inspection due date." },
      { name: "six_month_vehicle_inspection", description: "Driver-submitted six-month inspection with photo evidence and signature." },
    ],
    notifications: [
      { name: "Inspection assigned", description: "Notify the assigned driver when a recurring inspection is created." },
      { name: "Inspection overdue", description: "Escalate to the supervisor when an inspection is seven days overdue." },
    ],
    approvals: [],
    acceptanceCriteria: [
      "A vehicle with a next_inspection_due date in the past produces exactly one vehicle_inspection record per due date.",
      "The driver receives an assignment notification when the inspection is created.",
      "Photo evidence is stored privately and linked to the inspection record.",
      "An inspection seven days past due triggers a supervisor escalation notification.",
    ],
  },
};

export const VEHICLE_INSPECTION_DEFINITION_FIXTURE = validateModuleDefinition({
  schemaVersion: 1,
  slug: "vehicle-inspection",
  name: "Vehicle Inspections",
  description:
    "Six-month vehicle inspections with photo evidence, checklist, signature, and supervisor escalation.",
  departmentId: VEHICLE_INSPECTION_DEPARTMENT_ID,
  icon: "truck",
  recordTypes: [
    {
      id: "vehicle",
      label: "Vehicle",
      fields: [
        { id: "assigned_driver_id", label: "Assigned Driver", type: "text", required: true },
        { id: "supervisor_id", label: "Supervisor", type: "text", required: true },
        { id: "vin", label: "VIN", type: "text", required: true, maxLength: 17 },
        { id: "license_plate", label: "License Plate", type: "text", required: true, maxLength: 15 },
        { id: "next_inspection_due", label: "Next Inspection Due", type: "date", required: true },
        {
          id: "status",
          label: "Status",
          type: "select",
          required: true,
          options: ["active", "out_of_service"],
        },
      ],
    },
    {
      id: "vehicle_inspection",
      label: "Vehicle Inspection",
      fields: [
        { id: "vehicle_id", label: "Vehicle", type: "text", required: true },
        { id: "inspector_id", label: "Inspector", type: "text", required: true },
        { id: "inspection_date", label: "Inspection Date", type: "date", required: true },
        { id: "due_date", label: "Due Date", type: "date", required: true },
        { id: "vin", label: "VIN", type: "text", required: true, maxLength: 17 },
        { id: "license_plate", label: "License Plate", type: "text", required: true, maxLength: 15 },
        { id: "exterior_photos", label: "Exterior Photos", type: "photo", required: true },
        { id: "interior_photos", label: "Interior Photos", type: "photo", required: true },
        { id: "tires_ok", label: "Tires OK", type: "checkbox", required: true },
        { id: "brakes_ok", label: "Brakes OK", type: "checkbox", required: true },
        { id: "lights_ok", label: "Lights OK", type: "checkbox", required: true },
        { id: "cab_ok", label: "Cab OK", type: "checkbox", required: true },
        { id: "issues", label: "Issues", type: "textarea", maxLength: 5000 },
        {
          id: "severity",
          label: "Severity",
          type: "select",
          required: true,
          options: ["none", "minor", "major", "critical"],
        },
        { id: "employee_signature", label: "Employee Signature", type: "signature", required: true, maxLength: 200 },
        {
          id: "status",
          label: "Status",
          type: "select",
          required: true,
          options: ["submitted", "action_required", "completed"],
        },
      ],
    },
  ],
  forms: [
    {
      id: "vehicle_setup",
      title: "Vehicle Setup",
      description: "Register a vehicle for the inspection program.",
      recordTypeId: "vehicle",
      fields: [
        "assigned_driver_id",
        "supervisor_id",
        "vin",
        "license_plate",
        "next_inspection_due",
        "status",
      ],
      submitLabel: "Save Vehicle",
    },
    {
      id: "six_month_vehicle_inspection",
      title: "Six-Month Vehicle Inspection",
      description: "Complete the inspection checklist with photos and signature.",
      recordTypeId: "vehicle_inspection",
      fields: [
        "vehicle_id",
        "inspector_id",
        "inspection_date",
        "due_date",
        "vin",
        "license_plate",
        "exterior_photos",
        "interior_photos",
        "tires_ok",
        "brakes_ok",
        "lights_ok",
        "cab_ok",
        "issues",
        "severity",
        "employee_signature",
        "status",
      ],
      submitLabel: "Submit Inspection",
    },
  ],
  workflows: [
    {
      id: "six_month_recurrence",
      label: "Six-Month Inspection Cycle",
      trigger: "schedule",
      recordTypeId: "vehicle",
      delayDays: 0,
      schedule: { fieldId: "next_inspection_due", recurrenceMonths: 6 },
      actions: [
        {
          type: "create_record",
          recordTypeId: "vehicle_inspection",
          formId: "six_month_vehicle_inspection",
          fieldTemplates: {
            vehicle_id: "{{record.id}}",
            inspector_id: "{{record.assigned_driver_id}}",
            due_date: "{{record.next_inspection_due}}",
            vin: "{{record.vin}}",
            license_plate: "{{record.license_plate}}",
            status: "submitted",
          },
        },
        {
          type: "notify_user",
          targetFieldId: "assigned_driver_id",
          messageTemplate:
            "Your six-month inspection for vehicle {{record.license_plate}} is due {{record.next_inspection_due}}.",
        },
      ],
    },
    {
      id: "inspection_overdue_escalation",
      label: "Overdue Inspection Escalation",
      trigger: "overdue",
      recordTypeId: "vehicle_inspection",
      delayDays: 7,
      actions: [
        {
          type: "notify_supervisor",
          messageTemplate:
            "Inspection {{record.id}} for vehicle {{record.vehicle_id}} is overdue.",
        },
      ],
    },
  ],
  dashboards: [
    { type: "count", recordTypeId: "vehicle_inspection", label: "Inspections" },
    {
      type: "status_breakdown",
      recordTypeId: "vehicle_inspection",
      label: "Inspection Status",
    },
    {
      type: "due_list",
      recordTypeId: "vehicle_inspection",
      label: "Upcoming Inspections",
      limit: 10,
    },
  ],
});
