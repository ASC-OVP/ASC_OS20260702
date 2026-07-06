import { redirect } from "next/navigation";

export default function NewClassPage() {
  redirect("/classes?create=1");
}
