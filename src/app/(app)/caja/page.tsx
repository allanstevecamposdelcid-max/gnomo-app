import { redirect } from "next/navigation";
// La caja diaria vive ahora en el Dashboard (con ganancias protegidas por contraseña)
export default function Page() { redirect("/"); }
