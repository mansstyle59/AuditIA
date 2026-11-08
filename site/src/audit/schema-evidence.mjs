/* AuditIA — preuve stricte de schéma d'établissement local.
   Un type Organization générique ne prouve pas la présence d'un LocalBusiness. */

const LOCAL_BUSINESS_TYPES = new Set([
  "LocalBusiness",
  "Restaurant",
  "FoodEstablishment",
  "Bakery",
  "CafeOrCoffeeShop",
  "BarOrPub",
  "Store",
  "HairSalon",
  "BeautySalon",
  "DaySpa",
  "HealthAndBeautyBusiness",
  "Hotel",
  "LodgingBusiness",
  "AutoRepair",
  "AutomotiveBusiness",
  "HomeAndConstructionBusiness",
  "Plumber",
  "Electrician",
  "HousePainter",
  "ProfessionalService",
  "MedicalBusiness",
  "Dentist",
  "Physician",
  "MedicalClinic",
  "Pharmacy",
  "Florist",
  "RealEstateAgent",
  "VeterinaryCare",
  "AnimalShelter",
  "TravelAgency",
  "SportsActivityLocation",
  "ShoppingCenter",
  "GeneralContractor",
  "Locksmith",
  "HVACBusiness",
]);

function schemaTypeName(value) {
  const type = String(value || "").trim().replace(/\/+$/, "");
  return type.split(/[/:#]/).pop() || "";
}

export function hasLocalBusinessSchema(types) {
  const values = Array.isArray(types) ? types : [types];
  return values.some(value => LOCAL_BUSINESS_TYPES.has(schemaTypeName(value)));
}
