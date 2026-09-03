// Directions link for an appointment (web Appointments tab + phone companion).
//
// Before v1.58.2 both surfaces built a Google Maps SEARCH link
// (maps.google.com/?q= / maps/search/?api=1&query=), which opens a results
// list to pick from instead of routing anywhere; the companion also hid the
// button unless the appointment carried an address. This builds a DIRECTIONS
// link (maps/dir/?api=1&destination=) so Google Maps navigates from the
// phone's current location straight to the appointment's location.
//
// Destination, most specific first:
//   1. the appointment's own address (facility name prefixed so a shared
//      medical-campus address still resolves to the right building),
//   2. the matching care-team member's address (by provider, else by facility),
//   3. the facility name alone.
import { matchCareTeamMember } from "./careTeamMatch.js";

const clean = (s) => (s == null ? "" : String(s).trim());

/** Resolve the best destination string for an appointment, or "" when nothing usable exists. */
export function appointmentDestination(appt, careTeam = []) {
  if (!appt) return "";
  const facility = clean(appt.facility);
  const address = clean(appt.address);
  if (address) return facility && !address.toLowerCase().includes(facility.toLowerCase()) ? `${facility}, ${address}` : address;

  const team = Array.isArray(careTeam) ? careTeam : [];
  const byProvider = clean(appt.provider) ? matchCareTeamMember(appt.provider, team) : null;
  const byFacility = facility
    ? team.find(m => clean(m.facility).toLowerCase() === facility.toLowerCase() && clean(m.address))
    : null;
  const member = (byProvider && clean(byProvider.address)) ? byProvider : byFacility;
  if (member && clean(member.address)) {
    const memberFacility = facility || clean(member.facility);
    const memberAddress = clean(member.address);
    return memberFacility && !memberAddress.toLowerCase().includes(memberFacility.toLowerCase())
      ? `${memberFacility}, ${memberAddress}`
      : memberAddress;
  }
  return facility;
}

/** Google Maps directions URL to the appointment, or null when there is no destination. */
export function directionsUrl(appt, careTeam = []) {
  const dest = appointmentDestination(appt, careTeam);
  if (!dest) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}&travelmode=driving`;
}
