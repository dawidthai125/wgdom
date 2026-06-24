/**
 * TP203 — Address Parser Recovery M1
 */
import { parseJobAddressParts } from "../src/lib/wm-print/address-vars.ts";

const assert = (cond, msg) => {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`PASS: ${msg}`);
};

function expect(address, flatNumber, exp) {
  const got = parseJobAddressParts(address, flatNumber);
  const label = JSON.stringify({ address, flatNumber });
  assert(got.street === exp.street, `${label} street → ${JSON.stringify(got.street)}`);
  assert(got.building === exp.building, `${label} building → ${JSON.stringify(got.building)}`);
  assert(got.apartment === exp.apartment, `${label} apartment → ${JSON.stringify(got.apartment)}`);
  if (exp.fullAddress !== undefined) {
    assert(got.fullAddress === exp.fullAddress, `${label} fullAddress → ${JSON.stringify(got.fullAddress)}`);
  }
}

console.log("TP203 — parseJobAddressParts\n");

// --- Wymagane przypadki TP203 ---
expect("Kleczkowska 26", "", {
  street: "Kleczkowska",
  building: "26",
  apartment: "",
  fullAddress: "Kleczkowska 26",
});

expect("Kleczkowska 26/3", "", {
  street: "Kleczkowska",
  building: "26",
  apartment: "3",
  fullAddress: "Kleczkowska 26/3",
});

expect("Kleczkowska 26 m.3", "", {
  street: "Kleczkowska",
  building: "26",
  apartment: "3",
  fullAddress: "Kleczkowska 26/3",
});

expect("Kleczkowska 26 m 3", "", {
  street: "Kleczkowska",
  building: "26",
  apartment: "3",
});

expect("Kleczkowska 26 lok.3", "", {
  street: "Kleczkowska",
  building: "26",
  apartment: "3",
});

expect("Kleczkowska 26 lok 3", "", {
  street: "Kleczkowska",
  building: "26",
  apartment: "3",
});

expect("Kleczkowska 26 mieszkanie 3", "", {
  street: "Kleczkowska",
  building: "26",
  apartment: "3",
});

expect("Kleczkowska 26 mieszk. 3", "", {
  street: "Kleczkowska",
  building: "26",
  apartment: "3",
});

expect("Wyszyńskiego 12A/7", "", {
  street: "Wyszyńskiego",
  building: "12A",
  apartment: "7",
  fullAddress: "Wyszyńskiego 12A/7",
});

expect("Wrocławska 5B", "", {
  street: "Wrocławska",
  building: "5B",
  apartment: "",
  fullAddress: "Wrocławska 5B",
});

// flatNumber z pola roboty gdy brak lokalu w adresie
expect("Kleczkowska 26 m.3", "3", {
  street: "Kleczkowska",
  building: "26",
  apartment: "3",
});

// --- Regresja wsteczna ---
expect("Gorlicka 26", "6", {
  street: "Gorlicka",
  building: "26",
  apartment: "6",
  fullAddress: "Gorlicka 26/6",
});

expect("Sępa Szarzyńskiego 83", "7", {
  street: "Sępa Szarzyńskiego",
  building: "83",
  apartment: "7",
  fullAddress: "Sępa Szarzyńskiego 83/7",
});

expect("", "12", {
  street: "",
  building: "",
  apartment: "12",
  fullAddress: "/12",
});

console.log("\nAll TP203 address parser checks passed.");
