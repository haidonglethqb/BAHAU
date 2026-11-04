// Mock generator for DAU Faculty Payroll (Zero-Crash Fallback)
export interface MockFacultyRecord {
  id: string
  employeeId: string
  employeeCode: string
  employeeName: string
  departmentName: string
  academicTitle: string
  positionName: string
  salaryCoefficient: number
  standardWorkDays: number
  actualWorkDays: number
  unpaidLeaveDays: number
  workDaysDeduction: number
  kpiRanking: 'A' | 'B' | 'C' | 'D'
  kpiExtraIncome: number
  overtimeTeachingHours: number
  overtimeTeachingPay: number
  grossIncome: number
  baseSalary: number
  leadershipAllowance: number
  seniorityAllowance: number
  pedagogicalAllowance: number
  socialInsurance: number
  healthInsurance: number
  unemploymentInsurance: number
  totalInsurance: number
  personalIncomeTax: number
  netSalary: number
  status: 'PENDING' | 'APPROVED' | 'PAID'
}

const BASE_RATE = 2340000

export const RAW_FACULTY_LIST = [
  {
    employeeCode: 'DAU260001',
    employeeName: 'PGS.TS. Trần Thị Bình',
    departmentName: 'Khoa Kiến trúc',
    academicTitle: 'Phó Giáo sư',
    positionName: 'Trưởng khoa',
    salaryCoefficient: 6.78,
    leadershipCoeff: 0.8,
    seniorityCoeff: 0.15,
    actualWorkDays: 22,
    unpaidLeaveDays: 0,
    kpiRanking: 'A' as const,
    overtimeHours: 12.0,
  },
  {
    employeeCode: 'DAU260003',
    employeeName: 'ThS. Nguyễn Văn An',
    departmentName: 'Khoa Kiến trúc',
    academicTitle: 'Thạc sĩ',
    positionName: 'Giảng viên',
    salaryCoefficient: 4.98,
    leadershipCoeff: 0,
    seniorityCoeff: 0.08,
    actualWorkDays: 21,
    unpaidLeaveDays: 1,
    kpiRanking: 'A' as const,
    overtimeHours: 7.5,
  },
  {
    employeeCode: 'DAU260002',
    employeeName: 'TS. Lê Hoàng Nam',
    departmentName: 'Khoa Xây dựng',
    academicTitle: 'Tiến sĩ',
    positionName: 'Phó Trưởng khoa',
    salaryCoefficient: 5.64,
    leadershipCoeff: 0.6,
    seniorityCoeff: 0.12,
    actualWorkDays: 22,
    unpaidLeaveDays: 0,
    kpiRanking: 'B' as const,
    overtimeHours: 5.0,
  },
  {
    employeeCode: 'DAU260004',
    employeeName: 'ThS. Phạm Thị Mai',
    departmentName: 'Khoa Quy hoạch',
    academicTitle: 'Thạc sĩ',
    positionName: 'Giảng viên',
    salaryCoefficient: 4.32,
    leadershipCoeff: 0,
    seniorityCoeff: 0.05,
    actualWorkDays: 22,
    unpaidLeaveDays: 0,
    kpiRanking: 'B' as const,
    overtimeHours: 0.0,
  },
  {
    employeeCode: 'DAU260005',
    employeeName: 'GS.TS. Hoàng Đức Dũng',
    departmentName: 'Ban Giám hiệu',
    academicTitle: 'Giáo sư',
    positionName: 'Hiệu trưởng',
    salaryCoefficient: 8.0,
    leadershipCoeff: 1.3,
    seniorityCoeff: 0.25,
    actualWorkDays: 22,
    unpaidLeaveDays: 0,
    kpiRanking: 'A' as const,
    overtimeHours: 10.0,
  },
  {
    employeeCode: 'DAU260008',
    employeeName: 'ThS. Lê Minh Cường',
    departmentName: 'Phòng Tổ chức Hành chính',
    academicTitle: 'Thạc sĩ',
    positionName: 'Chuyên viên TCHC',
    salaryCoefficient: 4.65,
    leadershipCoeff: 0,
    seniorityCoeff: 0.07,
    actualWorkDays: 22,
    unpaidLeaveDays: 0,
    kpiRanking: 'A' as const,
    overtimeHours: 0.0,
  },
  {
    employeeCode: 'DAU260009',
    employeeName: 'ThS. Đặng Thu Hà',
    departmentName: 'Khoa Kiến trúc',
    academicTitle: 'Thạc sĩ',
    positionName: 'Giảng viên',
    salaryCoefficient: 4.65,
    leadershipCoeff: 0,
    seniorityCoeff: 0.06,
    actualWorkDays: 22,
    unpaidLeaveDays: 0,
    kpiRanking: 'A' as const,
    overtimeHours: 8.0,
  },
  {
    employeeCode: 'DAU260010',
    employeeName: 'KTS. Vũ Đức Thịnh',
    departmentName: 'Khoa Kiến trúc',
    academicTitle: 'Kiến trúc sư',
    positionName: 'Giảng viên Studio',
    salaryCoefficient: 3.99,
    leadershipCoeff: 0,
    seniorityCoeff: 0.03,
    actualWorkDays: 20.5,
    unpaidLeaveDays: 1.5,
    kpiRanking: 'B' as const,
    overtimeHours: 14.0,
  },
  {
    employeeCode: 'DAU260011',
    employeeName: 'ThS. Bùi Lan Anh',
    departmentName: 'Khoa Xây dựng',
    academicTitle: 'Thạc sĩ',
    positionName: 'Giảng viên',
    salaryCoefficient: 4.32,
    leadershipCoeff: 0,
    seniorityCoeff: 0.05,
    actualWorkDays: 22,
    unpaidLeaveDays: 0,
    kpiRanking: 'A' as const,
    overtimeHours: 4.0,
  },
  {
    employeeCode: 'DAU260012',
    employeeName: 'TS. Ngô Quang Hải',
    departmentName: 'Khoa Quy hoạch',
    academicTitle: 'Tiến sĩ',
    positionName: 'Trưởng Bộ môn',
    salaryCoefficient: 5.31,
    leadershipCoeff: 0.4,
    seniorityCoeff: 0.1,
    actualWorkDays: 22,
    unpaidLeaveDays: 0,
    kpiRanking: 'A' as const,
    overtimeHours: 6.0,
  },
]

export function computeMockMember(raw: (typeof RAW_FACULTY_LIST)[0], month: number, year: number): MockFacultyRecord {
  const baseSalary = Math.round(raw.salaryCoefficient * BASE_RATE)
  const leadershipAllowance = Math.round(raw.leadershipCoeff * BASE_RATE)
  const seniorityAllowance = Math.round(baseSalary * raw.seniorityCoeff)
  const pedagogicalAllowance = Math.round((baseSalary + leadershipAllowance) * 0.3)

  const standardWorkDays = 22
  const unpaidLeaveDays = raw.unpaidLeaveDays || 0
  const actualWorkDays = raw.actualWorkDays || 22
  const workDaysDeduction = Math.round((baseSalary / standardWorkDays) * unpaidLeaveDays)

  const kpiMap = { A: 4250000, B: 2800000, C: 1200000, D: 0 }
  const kpiExtraIncome = kpiMap[raw.kpiRanking] || 2500000
  const overtimeTeachingPay = Math.round(raw.overtimeHours * 250000)

  const grossIncome =
    baseSalary +
    leadershipAllowance +
    seniorityAllowance +
    pedagogicalAllowance +
    kpiExtraIncome +
    overtimeTeachingPay -
    workDaysDeduction

  const insurableBase = baseSalary + leadershipAllowance + seniorityAllowance
  const socialInsurance = Math.round(insurableBase * 0.08)
  const healthInsurance = Math.round(insurableBase * 0.015)
  const unemploymentInsurance = Math.round(insurableBase * 0.01)
  const totalInsurance = socialInsurance + healthInsurance + unemploymentInsurance

  // Tax progressive bracket
  const personalDeduction = 11000000
  const taxable = Math.max(0, grossIncome - totalInsurance - personalDeduction)
  let personalIncomeTax = 0
  if (taxable > 0) {
    if (taxable <= 5000000) personalIncomeTax = taxable * 0.05
    else if (taxable <= 10000000) personalIncomeTax = 250000 + (taxable - 5000000) * 0.1
    else if (taxable <= 18000000) personalIncomeTax = 750000 + (taxable - 10000000) * 0.15
    else personalIncomeTax = 1950000 + (taxable - 18000000) * 0.2
  }
  personalIncomeTax = Math.round(personalIncomeTax)

  const netSalary = grossIncome - totalInsurance - personalIncomeTax

  return {
    id: `mock-pay-${raw.employeeCode}-${month}-${year}`,
    employeeId: `${raw.employeeCode}-ID`,
    employeeCode: raw.employeeCode,
    employeeName: raw.employeeName,
    departmentName: raw.departmentName,
    academicTitle: raw.academicTitle,
    positionName: raw.positionName,
    salaryCoefficient: raw.salaryCoefficient,
    standardWorkDays,
    actualWorkDays,
    unpaidLeaveDays,
    workDaysDeduction,
    kpiRanking: raw.kpiRanking,
    kpiExtraIncome,
    overtimeTeachingHours: raw.overtimeHours,
    overtimeTeachingPay,
    grossIncome,
    baseSalary,
    leadershipAllowance,
    seniorityAllowance,
    pedagogicalAllowance,
    socialInsurance,
    healthInsurance,
    unemploymentInsurance,
    totalInsurance,
    personalIncomeTax,
    netSalary,
    status: 'APPROVED',
  }
}

export function getMockPayrollData(
  month = 9,
  year = 2026,
  unitName?: string,
  searchQuery?: string
) {
  let items = RAW_FACULTY_LIST.map((m) => computeMockMember(m, month, year))

  if (unitName && unitName !== 'ALL') {
    items = items.filter((i) => i.departmentName === unitName)
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase()
    items = items.filter(
      (i) =>
        i.employeeName.toLowerCase().includes(q) ||
        i.employeeCode.toLowerCase().includes(q) ||
        i.positionName.toLowerCase().includes(q)
    )
  }

  const totalGrossPayout = items.reduce((sum, item) => sum + item.grossIncome, 0)
  const totalNetPayout = items.reduce((sum, item) => sum + item.netSalary, 0)
  const totalInsurancePayout = items.reduce((sum, item) => sum + item.totalInsurance, 0)
  const totalTaxWithheld = items.reduce((sum, item) => sum + item.personalIncomeTax, 0)

  const period = {
    id: `PAYROLL-${year}-${month.toString().padStart(2, '0')}`,
    month,
    year,
    totalEmployees: items.length,
    totalGrossPayout,
    totalNetPayout,
    totalInsurancePayout,
    totalTaxWithheld,
    status: 'APPROVED',
    submittedBy: 'ThS. Lê Minh Cường',
    submittedAt: `${year}-${month.toString().padStart(2, '0')}-05T08:30:00Z`,
    approvedBy: 'GS.TS. Hoàng Đức Dũng',
    approvedAt: `${year}-${month.toString().padStart(2, '0')}-08T15:00:00Z`,
    pkiSignature: 'RSA-SHA256:d8a9f20e4c837190b...DAU_PKI_CA',
  }

  return { period, items }
}
