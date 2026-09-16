"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const unit_1 = require("@bahau/contracts/unit");
const unit = {
    id: "123e4567-e89b-12d3-a456-426614174000",
    code: "DTV",
    name: "Phong Dao tao",
    unitType: "DEPARTMENT",
    parentId: null,
    managerEmployeeId: null,
    managerName: null,
    isActive: true,
    orderIndex: 2,
};
const res = unit_1.OrganizationalUnitDtoSchema.parse(unit);
console.log("Subpath import success:", res.code);
