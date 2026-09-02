export function formatPeerLabel(person: {
  name: string;
  title?: string | null;
  jobs?: string[] | null;
}) {
  const job = (person.jobs ?? []).filter(Boolean).slice(0, 2).join("·");
  const role = [person.title, job].filter(Boolean).join("/");
  return role ? `${person.name} (${role})` : person.name;
}
