import React, { useState, useRef, useEffect, useCallback } from "react";
import api from "../services/api";
import "./TemplateDesigner.css";

interface Field {
  id: string;
  field_type: string;
  label: string;
  // Position in pixels relative to the displayed image (top-left = 0,0)
  position_x: number;
  position_y: number;
  font_size: number;
  font_color: string;
  font_family: string;
  is_bold: boolean;
  is_italic: boolean;
  text_align: string;
}

interface Template {
  id: string;
  name: string;
  template_image_path: string;
  canvas_width?: number;
  canvas_height?: number;
  preview_certificate_id?: string;
  preview_verification_code?: string;
}

const FIELD_TYPES = [
  {
    type: "student_name",
    label: "Student Name",
    inputType: "text",
    placeholder: "Enter student name",
  },
  {
    type: "course_name",
    label: "Course Name",
    inputType: "text",
    placeholder: "Enter course name",
  },
  {
    type: "completion_date",
    label: "Completion Date",
    inputType: "date",
    placeholder: "",
  },
  {
    type: "certificate_id",
    label: "Certificate ID",
    inputType: "auto",
    placeholder: "Auto-generated",
  },
  {
    type: "verification_link",
    label: "Verification Link",
    inputType: "auto",
    placeholder: "Auto-generated",
  },
];

function getPreviewValue(
  fieldType: string,
  previewValues: Record<string, string>,
  previewCertId?: string,
  previewVerifCode?: string,
): string {
  if (fieldType === "certificate_id") {
    return previewCertId || "CERT-XXXXXX";
  }
  if (fieldType === "verification_link") {
    return previewVerifCode
      ? `sarvarth.com/verify/${previewVerifCode}`
      : "sarvarth.com/verify/XXXXXX";
  }

  if (previewValues[fieldType]) {
    if (fieldType === "completion_date") {
      const d = new Date(previewValues[fieldType]);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      }
    }
    return previewValues[fieldType];
  }
  switch (fieldType) {
    case "student_name":
      return "Student Name";
    case "course_name":
      return "Course Name";
    case "completion_date":
      return "Completion Date";
    default:
      return fieldType;
  }
}

export default function TemplateDesigner() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null,
  );
  const [fields, setFields] = useState<Field[]>([]);
  const [selectedField, setSelectedField] = useState<Field | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [toast, setToast] = useState<{ type: string; message: string } | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track which field is being dragged
  const [draggingFieldId, setDraggingFieldId] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Preview IDs from backend
  const [previewCertId, setPreviewCertId] = useState<string>("");
  const [previewVerifCode, setPreviewVerifCode] = useState<string>("");

  const [previewValues, setPreviewValues] = useState<Record<string, string>>({
    student_name: "",
    course_name: "",
    completion_date: "",
  });

  // Current displayed image size
  const [imgDims, setImgDims] = useState({ width: 0, height: 0 });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await api.get("/templates");
      setTemplates(res.data.templates);
    } catch (err) {
      console.error("Failed to fetch templates:", err);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("template", file);
      formData.append("name", templateName || file.name);

      const res = await api.post("/templates/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const newTemplate = res.data.template;
      setTemplates((prev) => [newTemplate, ...prev]);
      setSelectedTemplate(newTemplate);
      setFields([]);
      setPreviewCertId("");
      setPreviewVerifCode("");
      showToast("success", "Template uploaded successfully!");
    } catch (err) {
      showToast("error", "Failed to upload template.");
    } finally {
      setUploading(false);
    }
  };

  const loadTemplate = async (template: Template) => {
    setSelectedTemplate(template);
    setSelectedField(null);
    try {
      const res = await api.get(`/templates/${template.id}`);
      const loadedTemplate = res.data.template;
      const loadedFields = res.data.fields;

      setFields(
        loadedFields.map((f: any) => ({
          ...f,
          id: f.id || crypto.randomUUID(),
          position_x: f.position_x ?? 50,
          position_y: f.position_y ?? 50,
        })),
      );

      setPreviewCertId(loadedTemplate.preview_certificate_id || "");
      setPreviewVerifCode(loadedTemplate.preview_verification_code || "");
    } catch {
      setFields([]);
      setPreviewCertId("");
      setPreviewVerifCode("");
    }
  };

  const handleImageLoad = () => {
    if (imgRef.current) {
      const dims = {
        width: imgRef.current.clientWidth,
        height: imgRef.current.clientHeight,
      };
      setImgDims(dims);
      console.log(
        `[Designer] Image loaded: display size = ${dims.width}x${dims.height}, natural size = ${imgRef.current.naturalWidth}x${imgRef.current.naturalHeight}`,
      );
    }
  };

  const addField = (type: string, label: string) => {
    if (fields.some((f) => f.field_type === type)) {
      showToast("error", `"${label}" field already added.`);
      return;
    }

    // Default position: stagger fields vertically
    const newField: Field = {
      id: crypto.randomUUID(),
      field_type: type,
      label,
      position_x: 50,
      position_y: 50 + fields.length * 30,
      font_size: 20,
      font_color: "#000000",
      font_family: "Helvetica",
      is_bold: false,
      is_italic: false,
      text_align: "left",
    };
    setFields((prev) => [...prev, newField]);
    setSelectedField(newField);
  };

  // --- Custom drag system using mouse events ---
  const handleMouseDown = (e: React.MouseEvent, fieldId: string) => {
    e.preventDefault();
    e.stopPropagation();

    const field = fields.find((f) => f.id === fieldId);
    if (!field || !containerRef.current) return;

    setSelectedField(field);

    const containerRect = containerRef.current.getBoundingClientRect();

    dragOffset.current = {
      x: e.clientX - containerRect.left - field.position_x,
      y: e.clientY - containerRect.top - field.position_y,
    };

    setDraggingFieldId(fieldId);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!draggingFieldId || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();

      // New position = mouse position - container offset - drag offset
      let newX = e.clientX - containerRect.left - dragOffset.current.x;
      let newY = e.clientY - containerRect.top - dragOffset.current.y;

      // Clamp to image bounds (keep within the image)
      newX = Math.max(0, Math.min(newX, imgDims.width - 20));
      newY = Math.max(0, Math.min(newY, imgDims.height - 10));

      setFields((prev) =>
        prev.map((f) =>
          f.id === draggingFieldId
            ? { ...f, position_x: newX, position_y: newY }
            : f,
        ),
      );
    },
    [draggingFieldId, imgDims],
  );

  const handleMouseUp = useCallback(() => {
    if (draggingFieldId) {
      setFields((prev) => {
        const updatedField = prev.find((f) => f.id === draggingFieldId);
        if (updatedField) setSelectedField({ ...updatedField });
        return prev;
      });
    }
    setDraggingFieldId(null);
  }, [draggingFieldId]);

  useEffect(() => {
    if (draggingFieldId) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [draggingFieldId, handleMouseMove, handleMouseUp]);

  const updateField = (key: keyof Field, value: any) => {
    if (!selectedField) return;
    const updated = { ...selectedField, [key]: value };
    setSelectedField(updated);
    setFields((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
  };

  const removeField = (fieldId: string) => {
    setFields((prev) => prev.filter((f) => f.id !== fieldId));
    if (selectedField?.id === fieldId) setSelectedField(null);
  };

  const deleteTemplate = async (
    e: React.MouseEvent,
    templateId: string,
    tplName: string,
  ) => {
    e.stopPropagation();

    if (
      !window.confirm(
        `Are you sure you want to delete "${tplName}"?\n\nThis will also delete all certificates generated from this template.`,
      )
    ) {
      return;
    }

    try {
      await api.delete(`/templates/${templateId}`);
      setTemplates((prev) => prev.filter((t) => t.id !== templateId));

      if (selectedTemplate?.id === templateId) {
        setSelectedTemplate(null);
        setFields([]);
        setSelectedField(null);
        setPreviewCertId("");
        setPreviewVerifCode("");
      }

      showToast("success", `Template "${tplName}" deleted.`);
    } catch {
      showToast("error", "Failed to delete template.");
    }
  };

  const saveFields = async () => {
    if (!selectedTemplate || !imgRef.current) return;
    setSaving(true);
    try {
      // Send the current display dimensions along with the fields
      // The PDF service will use these to scale positions to the full image resolution
      const displayWidth = imgRef.current.clientWidth;
      const displayHeight = imgRef.current.clientHeight;

      console.log(
        `[Designer] Saving fields with canvas: ${displayWidth}x${displayHeight}`,
      );
      fields.forEach((f) => {
        console.log(
          `  -> ${f.field_type}: (${f.position_x.toFixed(1)}, ${f.position_y.toFixed(1)}) size=${f.font_size}`,
        );
      });

      const res = await api.put(`/templates/${selectedTemplate.id}/fields`, {
        fields,
        canvas_width: displayWidth,
        canvas_height: displayHeight,
      });

      const newCertId = res.data.preview_certificate_id || "";
      const newVerifCode = res.data.preview_verification_code || "";
      setPreviewCertId(newCertId);
      setPreviewVerifCode(newVerifCode);

      setSelectedTemplate((prev) =>
        prev
          ? {
              ...prev,
              preview_certificate_id: newCertId,
              preview_verification_code: newVerifCode,
              canvas_width: displayWidth,
              canvas_height: displayHeight,
            }
          : null,
      );

      showToast(
        "success",
        `Fields saved! New IDs — Certificate: ${newCertId}, Verification: ${newVerifCode}`,
      );
    } catch {
      showToast("error", "Failed to save fields.");
    } finally {
      setSaving(false);
    }
  };

  const showToast = (type: string, message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const updatePreview = (fieldType: string, value: string) => {
    setPreviewValues((prev) => ({ ...prev, [fieldType]: value }));
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Template Designer</h1>
        <p>
          Upload a certificate image, add fields, and position them on the
          template
        </p>
      </div>

      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.message}</div>
      )}

      <div className="designer-container">
        {/* Sidebar */}
        <div className="designer-sidebar">
          {/* Upload */}
          <div className="card">
            <h3 style={{ marginBottom: "12px", fontSize: "0.95rem" }}>
              Upload Template
            </h3>
            <div className="input-group" style={{ marginBottom: "12px" }}>
              <input
                className="input"
                placeholder="Template name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            </div>
            <div
              className="upload-area"
              onClick={() => fileInputRef.current?.click()}
            >
              <span style={{ fontSize: "2rem" }}></span>
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "var(--text-secondary)",
                  marginTop: "8px",
                }}
              >
                {uploading ? "Uploading..." : "Click to upload PNG/JPG"}
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg"
              hidden
              onChange={handleUpload}
            />
          </div>

          {/* Template list */}
          {templates.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: "12px", fontSize: "0.95rem" }}>
                Your Templates
              </h3>
              <div className="field-list">
                {templates.map((t) => (
                  <div
                    key={t.id}
                    className={`field-item ${selectedTemplate?.id === t.id ? "selected" : ""}`}
                    onClick={() => loadTemplate(t)}
                  >
                    <span
                      style={{
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {t.name}
                    </span>
                    <button
                      onClick={(e) => deleteTemplate(e, t.id, t.name)}
                      title={`Delete ${t.name}`}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "2px 6px",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "0.85rem",
                        color: "var(--text-muted)",
                        transition: "all 0.2s ease",
                        flexShrink: 0,
                      }}
                      onMouseEnter={(e) => {
                        (e.target as HTMLElement).style.color = "#ef4444";
                        (e.target as HTMLElement).style.background =
                          "rgba(239, 68, 68, 0.1)";
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLElement).style.color = "red";
                        (e.target as HTMLElement).style.background = "none";
                      }}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Fields */}
          {selectedTemplate && (
            <div className="card">
              <h3 style={{ marginBottom: "12px", fontSize: "0.95rem" }}>
                Add Fields
              </h3>
              <div className="field-list">
                {FIELD_TYPES.map((ft) => {
                  const isAdded = fields.some((f) => f.field_type === ft.type);
                  return (
                    <div
                      key={ft.type}
                      className={`field-item ${isAdded ? "selected" : ""}`}
                      onClick={() => !isAdded && addField(ft.type, ft.label)}
                      style={
                        isAdded
                          ? {
                              opacity: 0.6,
                              cursor: "default",
                            }
                          : {}
                      }
                    >
                      <span>{ft.label}</span>
                      {isAdded ? (
                        <span
                          style={{
                            color: "#046429",
                            fontSize: "0.8rem",
                          }}
                        >
                          ✓ Added
                        </span>
                      ) : (
                        <span
                          style={{
                            color: "var(--primary-light)",
                          }}
                        >
                          +
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Field Data Inputs */}
          {selectedTemplate && fields.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: "12px", fontSize: "0.95rem" }}>
                Field Preview Data
              </h3>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {fields.map((field) => {
                  const fieldDef = FIELD_TYPES.find(
                    (ft) => ft.type === field.field_type,
                  );
                  if (!fieldDef) return null;

                  if (fieldDef.inputType === "auto") {
                    const displayValue =
                      field.field_type === "certificate_id"
                        ? previewCertId || "Save fields to generate"
                        : field.field_type === "verification_link"
                          ? previewVerifCode
                            ? `sarvarth.com/verify/${previewVerifCode}`
                            : "Save fields to generate"
                          : "🔒 Auto-generated by system";

                    return (
                      <div key={field.id} className="input-group">
                        <label
                          style={{
                            fontSize: "0.8rem",
                            color: "var(--text-secondary)",
                          }}
                        >
                          {fieldDef.label}
                        </label>
                        <div
                          style={{
                            padding: "8px 12px",
                            background: "var(--bg-elevated)",
                            borderRadius: "var(--radius-md)",
                            fontSize: "0.82rem",
                            color: previewCertId
                              ? "var(--success)"
                              : "var(--text-muted)",
                            border: "1px solid var(--border-default)",
                            fontStyle: previewCertId ? "normal" : "italic",
                            fontWeight: previewCertId ? "600" : "normal",
                            wordBreak: "break-all",
                          }}
                        >
                          {displayValue}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={field.id} className="input-group">
                      <label
                        style={{
                          fontSize: "0.8rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {fieldDef.label}
                      </label>
                      {fieldDef.inputType === "date" ? (
                        <input
                          type="date"
                          className="input"
                          value={previewValues[field.field_type] || ""}
                          onChange={(e) =>
                            updatePreview(field.field_type, e.target.value)
                          }
                        />
                      ) : (
                        <input
                          type="text"
                          className="input"
                          placeholder={fieldDef.placeholder}
                          value={previewValues[field.field_type] || ""}
                          onChange={(e) =>
                            updatePreview(field.field_type, e.target.value)
                          }
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Field Style Controls */}
          {selectedField && (
            <div className="field-controls">
              <h4>Style — {selectedField.label}</h4>
              <div className="control-row">
                <label>Size</label>
                <input
                  type="number"
                  className="input"
                  value={selectedField.font_size}
                  onChange={(e) =>
                    updateField("font_size", parseInt(e.target.value))
                  }
                  min={8}
                  max={72}
                  style={{ width: "80px" }}
                />
              </div>
              <div className="control-row">
                <label>Color</label>
                <input
                  type="color"
                  value={selectedField.font_color}
                  onChange={(e) => updateField("font_color", e.target.value)}
                />
              </div>
              <div className="control-row">
                <label>Font</label>
                <select
                  className="input"
                  value={selectedField.font_family}
                  onChange={(e) => updateField("font_family", e.target.value)}
                >
                  <option value="Helvetica">Helvetica</option>
                  <option value="Times-Roman">Times Roman</option>
                  <option value="Courier">Courier</option>
                </select>
              </div>
              <div className="control-row">
                <label>Bold</label>
                <input
                  type="checkbox"
                  checked={selectedField.is_bold}
                  onChange={(e) => updateField("is_bold", e.target.checked)}
                />
              </div>
              <div className="control-row">
                <label>Italic</label>
                <input
                  type="checkbox"
                  checked={selectedField.is_italic}
                  onChange={(e) => updateField("is_italic", e.target.checked)}
                />
              </div>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => removeField(selectedField.id)}
              >
                Remove Field
              </button>
            </div>
          )}

          {/* Save */}
          {selectedTemplate && fields.length > 0 && (
            <button
              className="btn btn-green"
              onClick={saveFields}
              disabled={saving}
            >
              {saving ? "Saving..." : " Save Field Layout"}
            </button>
          )}
        </div>

        {/* Canvas */}
        <div
          className={`designer-canvas ${selectedTemplate ? "has-image" : ""}`}
        >
          {!selectedTemplate ? (
            <div className="canvas-placeholder">
              <span style={{ fontSize: "3rem" }}></span>
              <p>Select or upload a template to begin designing</p>
            </div>
          ) : (
            <div ref={containerRef} className="template-image-container">
              <img
                ref={imgRef}
                src={selectedTemplate.template_image_path}
                alt="Template"
                onLoad={handleImageLoad}
                draggable={false}
                style={{
                  display: "block",
                  maxWidth: "100%",
                  height: "auto",
                  userSelect: "none",
                }}
              />
              {imgDims.width > 0 &&
                fields.map((field) => (
                  <div
                    key={field.id}
                    className={`draggable-field ${selectedField?.id === field.id ? "active" : ""} ${draggingFieldId === field.id ? "dragging" : ""}`}
                    onMouseDown={(e) => handleMouseDown(e, field.id)}
                    onClick={() => setSelectedField(field)}
                    style={{
                      left: `${field.position_x}px`,
                      top: `${field.position_y}px`,
                      fontSize: `${field.font_size}px`,
                      color: field.font_color,
                      fontFamily: field.font_family,
                      fontWeight: field.is_bold ? "bold" : "normal",
                      fontStyle: field.is_italic ? "italic" : "normal",
                      cursor:
                        draggingFieldId === field.id ? "grabbing" : "grab",
                    }}
                  >
                    {getPreviewValue(
                      field.field_type,
                      previewValues,
                      previewCertId,
                      previewVerifCode,
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
