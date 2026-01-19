"use client";

import { useState } from "react";
import UploadButton from "../UploadButton";
import ProjectNameInput from "./ProjectNameInput";

export default function UploadForm() {
  const [projectName, setProjectName] = useState("");

  return (
    <>
      <ProjectNameInput onChange={setProjectName} />

      <UploadButton projectName={projectName} />
    </>
  );
}
