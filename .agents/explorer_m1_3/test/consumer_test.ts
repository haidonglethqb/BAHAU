import {
  OrganizationalUnitDto,
  OrganizationalUnitDtoSchema,
  UnitTypeEnum,
  CreateUnitSchema,
  LoginRequest,
  StandardError
} from "@bahau/contracts";

const sampleUnit: OrganizationalUnitDto = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  code: "KT",
  name: "Khoa Kien truc",
  unitType: "FACULTY",
  parentId: null,
  managerEmployeeId: null,
  managerName: "TS. Nguyen Van A",
  isActive: true,
  orderIndex: 1,
  children: [
    {
      id: "123e4567-e89b-12d3-a456-426614174001",
      code: "BM_KTCT",
      name: "Bo mon Kien truc Cong trinh",
      unitType: "DIVISION",
      parentId: "123e4567-e89b-12d3-a456-426614174000",
      managerEmployeeId: null,
      managerName: null,
      isActive: true,
      orderIndex: 1,
      children: []
    }
  ]
};

const parsed = OrganizationalUnitDtoSchema.parse(sampleUnit);
console.log("Validation success:", parsed.code, parsed.children?.length);
