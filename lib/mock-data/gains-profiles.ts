/**
 * Mock GAINS Profiles for Affiliate Networking
 * GAINS = Goals, Accomplishments, Interests, Networks, Skills
 */

import type { GainsProfileDoc } from "../schema";
import { daysAgo } from "./affiliates";

export const mockGainsProfiles: GainsProfileDoc[] = [
  {
    id: "gains-001", affiliateId: "aff-001",
    goals: "Grow consulting practice to $1M revenue by 2026. Publish a book on manufacturing excellence. Speak at 10 industry conferences annually.",
    accomplishments: "Helped 45+ manufacturers improve OEE by average of 23%. Led $50M facility modernization at Boeing. Named Top 40 Under 40 in Manufacturing.",
    interests: "Process optimization, women in STEM advocacy, golf tournaments, wine regions of France, hiking the Appalachian Trail.",
    networks: "Women in Manufacturing (board member), Charlotte Chamber, ASQ Charlotte Section, NC MEP, Rotary Club of Charlotte.",
    skills: "Process engineering, Six Sigma Black Belt, project management, team leadership, public speaking, AutoCAD, Minitab.",
    createdAt: daysAgo(175), updatedAt: daysAgo(5),
  },
  {
    id: "gains-002", affiliateId: "aff-002",
    goals: "Certify 50 new companies in ISO standards this year. Develop online ISO training platform. Expand to aerospace certifications (AS9100).",
    accomplishments: "200+ successful ISO certifications. Zero failed audits in 15 years. Developed streamlined certification process reducing time by 40%.",
    interests: "Quality systems, photography, Asian cuisine cooking, chess tournaments, travel to historic manufacturing sites.",
    networks: "ASQ (Senior Member), Registrar Accreditation Board, NC MEP, Triangle Quality Council, Raleigh Chinese Association.",
    skills: "ISO 9001/14001/45001 auditing, IATF 16949, root cause analysis, documentation systems, training development, Mandarin Chinese.",
    createdAt: daysAgo(195), updatedAt: daysAgo(10),
  },
  {
    id: "gains-003", affiliateId: "aff-003",
    goals: "Transform 25 facilities using lean principles this year. Create lean certification program for community colleges. Run Boston Marathon again.",
    accomplishments: "Reduced waste by $15M+ across client facilities. Toyota Production System certified. Led kaizen events at 100+ facilities.",
    interests: "Continuous improvement, marathon running, organic gardening, reading business books, family camping trips.",
    networks: "AME (Association for Manufacturing Excellence), Lean Enterprise Institute, Greensboro Running Club, NC State Alumni.",
    skills: "Value stream mapping, kaizen facilitation, 5S implementation, TPM, kanban systems, Spanish fluency, endurance training.",
    createdAt: daysAgo(145), updatedAt: daysAgo(3),
  },
  {
    id: "gains-004", affiliateId: "aff-004",
    goals: "Automate 30 production lines this year. Launch cobot rental program for SMBs. Patent new safety system design.",
    accomplishments: "500+ automation projects completed. 8 patents in robotics and automation. Reduced labor costs by average 35% for clients.",
    interests: "Robotics, 3D printing, fishing on Jordan Lake, maker movement, mentoring engineering students, vintage electronics.",
    networks: "IEEE, Robotics Industry Association, NC State Engineering Advisory Board, Durham Maker Space, Local fishing club.",
    skills: "PLC programming, robot integration, machine vision, safety systems, CAD/CAM, electrical engineering, project budgeting.",
    createdAt: daysAgo(215), updatedAt: daysAgo(8),
  },
  {
    id: "gains-005", affiliateId: "aff-005",
    goals: "Train 500 new manufacturing workers this year. Launch apprenticeship program with 3 community colleges. Develop VR training modules.",
    accomplishments: "Trained 3,000+ manufacturing employees. Developed curriculum adopted by 5 community colleges. SHRM Senior Certified Professional.",
    interests: "Adult learning, yoga and meditation, watercolor painting, international travel, cultural exchange programs.",
    networks: "SHRM, ATD, Forsyth Tech Advisory Board, Winston-Salem Chamber, India Association of the Piedmont.",
    skills: "Curriculum development, instructional design, competency assessment, LMS administration, Hindi/Gujarati fluency.",
    createdAt: daysAgo(155), updatedAt: daysAgo(12),
  },
  {
    id: "gains-006", affiliateId: "aff-006",
    goals: "Help 20 manufacturers nearshore their supply chains. Launch supply chain risk assessment tool. Build partnership with Mexican manufacturers.",
    accomplishments: "Managed $2B+ in supply chain operations. Reduced client logistics costs by average 18%. APICS CSCP certified.",
    interests: "Supply chain resilience, bourbon distilleries, Carolina Panthers football, golf at Quail Hollow, coaching girls basketball.",
    networks: "APICS Charlotte, Council of Supply Chain Management Professionals, Charlotte Chamber, UNC Charlotte Alumni.",
    skills: "Supply chain strategy, vendor management, logistics optimization, risk assessment, ERP systems (SAP, Oracle), negotiation.",
    createdAt: daysAgo(185), updatedAt: daysAgo(7),
  },
  {
    id: "gains-007", affiliateId: "aff-007",
    goals: "Help 40 manufacturers start digital transformation journey. Grow podcast to 100K subscribers. Launch digital maturity assessment tool.",
    accomplishments: "Led digital initiatives saving clients $10M+. Podcast reaches 50K manufacturing professionals. Named Top Women in Manufacturing Technology.",
    interests: "Industry 4.0, mountain biking, rescue dog advocacy, tech podcasting, startup mentoring, sustainable technology.",
    networks: "Women in Tech, Tech Triangle, Startup Grind Raleigh, NC Tech Association, Triangle Mountain Bike Club.",
    skills: "IoT implementation, cloud systems, data analytics, MES systems, digital strategy, content creation, public speaking.",
    createdAt: daysAgo(115), updatedAt: daysAgo(2),
  },
  {
    id: "gains-008", affiliateId: "aff-008",
    goals: "Mentor 10 new quality consultants. Complete IATF 16949 certifications for 15 automotive suppliers. Write quality management textbook.",
    accomplishments: "200+ ISO certifications with zero failures. Trained 50+ quality professionals. Former ASQ Examiner.",
    interests: "Quality systems, woodworking, American history, spending time with grandchildren, church activities, mentoring.",
    networks: "ASQ (Fellow), AIAG, Greensboro Chamber, First Baptist Church leadership, Guilford Technical Advisory Board.",
    skills: "QMS development, internal auditing, FMEA, PPAP, APQP, statistical process control, mentoring, technical writing.",
    createdAt: daysAgo(245), updatedAt: daysAgo(15),
  },
];
