import { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import useWindowSize from "../hooks/useWindowSize";
import PageLayout from "../components/PageLayout";
import API from "../api/axios";
import toast from "react-hot-toast";

const Inventory = () => {
  const { colors } = useTheme();
  const { isMobile } = useWindowSize();

  // Data states
  const [products, setProducts] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [spiritTypes, setSpiritTypes] = useState([]);
  const [priceCategories, setPriceCategories] = useState([]);
  const [beerTypes, setBeerTypes] = useState([]);

  // UI states
  const [activeTab, setActiveTab] = useState("list");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [filterType, setFilterType] = useState("ALL");
  const [filterSize, setFilterSize] = useState("ALL");

  // Form state
  const emptyForm = {
    name: "",
    productType: "IMFL",
    subCategory: "",
    priceCategory: "Low",
    size: "",
    bottlesPerCase: "",
    govtCode: "",
    price: "",
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [productsRes, sizesRes, spiritRes, priceRes, beerRes] =
        await Promise.all([
          API.get("/products"),
          API.get("/config?type=bottleSize"),
          API.get("/config?type=spiritType"),
          API.get("/config?type=priceCategory"),
          API.get("/config?type=beerType"),
        ]);
      setProducts(productsRes.data);
      console.log("Products:", productsRes.data);
      console.log("Sizes:", sizesRes.data);
      setSizes(sizesRes.data);
      setSpiritTypes(spiritRes.data);
      setPriceCategories(priceRes.data);
      setBeerTypes(beerRes.data);
    } catch (error) {
      // Show exact error
      console.error("Full error:", error);
      console.error("Response:", error.response?.data);
      toast.error(
        error.response?.data?.message || `Failed to load: ${error.message}`,
      );
    } finally {
      setLoading(false);
    }
  };
  const handleSizeChange = (sizeValue) => {
    const selectedSize = sizes.find((s) => s.value === sizeValue);
    setForm((prev) => ({
      ...prev,
      size: sizeValue,
      bottlesPerCase: selectedSize?.meta?.defaultBottlesPerCase || "",
    }));
  };

  const handleTypeChange = (type) => {
    setForm((prev) => ({
      ...prev,
      productType: type,
      subCategory: "",
      priceCategory: type === "BEER" ? "NA" : "Low",
    }));
  };

  const handleEdit = (product) => {
    setForm({
      name: product.name,
      productType: product.productType,
      subCategory: product.subCategory,
      priceCategory: product.priceCategory,
      size: product.size,
      bottlesPerCase: product.bottlesPerCase,
      govtCode: product.govtCode || "",
      price: product.price,
    });
    setEditingProduct(product);
    setActiveTab("add");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this product?")) return;
    try {
      await API.delete(`/products/${id}`);
      toast.success("Product removed");
      fetchAll();
    } catch (error) {
      toast.error("Failed to remove product");
    }
  };

  const handleCancel = () => {
    setForm(emptyForm);
    setEditingProduct(null);
    setActiveTab("list");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !form.name ||
      !form.size ||
      !form.subCategory ||
      !form.price ||
      !form.govtCode
    ) {
      console.log(form.govtCode);
      toast.error("Please fill all required fields");
      return;
    }
    try {
      setSaving(true);
      if (editingProduct) {
        await API.put(`/products/${editingProduct._id}`, form);
        toast.success("Product updated!");
      } else {
        await API.post("/products", form);
        toast.success("Product added!");
      }
      setForm(emptyForm);
      setEditingProduct(null);
      setActiveTab("list");
      fetchAll();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // Filter and group products
  const filtered = products.filter((p) => {
    const typeMatch = filterType === "ALL" || p.productType === filterType;
    const sizeMatch = filterSize === "ALL" || p.size === filterSize;
    return typeMatch && sizeMatch;
  });

  const grouped = filtered.reduce((acc, product) => {
    const key = product.size;
    if (!acc[key]) acc[key] = {};
    const cat = product.priceCategory || "NA";
    if (!acc[key][cat]) acc[key][cat] = [];
    acc[key][cat].push(product);
    return acc;
  }, {});

  // Shared styles
  const inputStyle = {
    padding: "10px 12px",
    borderRadius: "8px",
    border: `1px solid ${colors.inputBorder}`,
    backgroundColor: colors.input,
    color: colors.text,
    fontSize: "14px",
    outline: "none",
    width: "100%",
  };

  const labelStyle = {
    fontSize: "12px",
    fontWeight: "600",
    color: colors.textSub,
    textTransform: "uppercase",
    letterSpacing: "0.4px",
    marginBottom: "6px",
    display: "block",
  };

  if (loading) {
    return (
      <PageLayout title="🗂️ Inventory">
        <p style={{ color: colors.textSub }}>Loading...</p>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="🗂️ Inventory">
      {/* ── Tabs ── */}
      <div
        style={{
          display: "flex",
          gap: "0",
          marginBottom: "24px",
          borderBottom: `2px solid ${colors.border}`,
        }}
      >
        {[
          { key: "list", label: "📋 Product List" },
          {
            key: "add",
            label: editingProduct ? "✏️ Edit Product" : "➕ Add Product",
          },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              if (tab.key === "list") {
                setEditingProduct(null);
                setForm(emptyForm);
              }
            }}
            style={{
              padding: isMobile ? "10px 16px" : "12px 24px",
              backgroundColor: "transparent",
              border: "none",
              borderBottom:
                activeTab === tab.key
                  ? `2px solid ${colors.accent}`
                  : "2px solid transparent",
              color: activeTab === tab.key ? colors.accent : colors.textSub,
              fontSize: isMobile ? "13px" : "14px",
              fontWeight: activeTab === tab.key ? "600" : "400",
              cursor: "pointer",
              marginBottom: "-2px",
              transition: "all 0.15s ease",
              whiteSpace: "nowrap",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Product List ── */}
      {activeTab === "list" && (
        <div>
          {/* Filters Row */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                style={{ ...inputStyle, width: "auto", minWidth: "120px" }}
              >
                <option value="ALL">All Types</option>
                <option value="IMFL">IMFL</option>
                <option value="BEER">Beer</option>
              </select>
              <select
                value={filterSize}
                onChange={(e) => setFilterSize(e.target.value)}
                style={{ ...inputStyle, width: "auto", minWidth: "120px" }}
              >
                <option value="ALL">All Sizes</option>
                {sizes
                  .filter((s) => s.meta?.productType === form.productType)
                  .map((s) => (
                    <option key={s._id} value={s.value}>
                      {s.value}
                    </option>
                  ))}
              </select>
            </div>

            <div
              style={{
                fontSize: "13px",
                color: colors.textSub,
                fontWeight: "500",
              }}
            >
              {filtered.length} products
            </div>
          </div>

          {/* Product Groups */}
          {Object.keys(grouped).length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "60px 20px",
                color: colors.textSub,
              }}
            >
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>🍾</div>
              <p style={{ fontSize: "16px", color: colors.text }}>
                No products yet
              </p>
              <p style={{ fontSize: "13px", marginTop: "8px" }}>
                Click "Add Product" tab to get started
              </p>
              <button
                onClick={() => setActiveTab("add")}
                style={{
                  marginTop: "16px",
                  padding: "10px 24px",
                  backgroundColor: colors.accent,
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                + Add First Product
              </button>
            </div>
          ) : (
            Object.entries(grouped)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([size, categories]) => (
                <div key={size} style={{ marginBottom: "28px" }}>
                  {/* Size Header */}
                  <div
                    style={{
                      fontSize: "15px",
                      fontWeight: "700",
                      color: colors.accent,
                      marginBottom: "12px",
                      paddingBottom: "8px",
                      borderBottom: `2px solid ${colors.accent}`,
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    🍾 {size}
                    <span
                      style={{
                        fontSize: "12px",
                        color: colors.textSub,
                        fontWeight: "400",
                      }}
                    >
                      ({Object.values(categories).flat().length} products)
                    </span>
                  </div>

                  {/* Categories */}
                  {Object.entries(categories)
                    .sort(([a], [b]) => {
                      const order = { Low: 1, Medium: 2, Premium: 3, NA: 4 };
                      return (order[a] || 5) - (order[b] || 5);
                    })
                    .map(([category, items]) => (
                      <div key={category} style={{ marginBottom: "16px" }}>
                        {/* Category Label */}
                        {category !== "NA" && (
                          <div
                            style={{
                              fontSize: "11px",
                              fontWeight: "600",
                              color: colors.textSub,
                              marginBottom: "8px",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                              paddingLeft: "4px",
                            }}
                          >
                            {category}
                          </div>
                        )}

                        {/* Mobile: Cards | Desktop: Table */}
                        {isMobile ? (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "8px",
                            }}
                          >
                            {items.map((product) => (
                              <div
                                key={product._id}
                                style={{
                                  backgroundColor: colors.card,
                                  borderRadius: "10px",
                                  border: `1px solid ${colors.border}`,
                                  padding: "14px",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "flex-start",
                                    marginBottom: "8px",
                                  }}
                                >
                                  <div>
                                    <div
                                      style={{
                                        fontWeight: "600",
                                        color: colors.text,
                                        fontSize: "14px",
                                      }}
                                    >
                                      {product.name}
                                    </div>
                                    <div
                                      style={{
                                        fontSize: "12px",
                                        color: colors.textSub,
                                        marginTop: "2px",
                                      }}
                                    >
                                      {product.subCategory}
                                    </div>
                                  </div>
                                  <div
                                    style={{
                                      fontWeight: "600",
                                      color: colors.text,
                                      fontSize: "15px",
                                    }}
                                  >
                                    ₹{product.price}
                                  </div>
                                </div>
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize: "12px",
                                      color: colors.textSub,
                                      fontFamily: "monospace",
                                    }}
                                  >
                                    Code: {product.govtCode || "—"}
                                    &nbsp;|&nbsp;
                                    {product.bottlesPerCase} btl/case
                                  </div>
                                  <div style={{ display: "flex", gap: "6px" }}>
                                    <button
                                      onClick={() => handleEdit(product)}
                                      style={{
                                        padding: "4px 10px",
                                        backgroundColor: colors.info + "20",
                                        color: colors.info,
                                        border: `1px solid ${colors.info}40`,
                                        borderRadius: "6px",
                                        fontSize: "12px",
                                        cursor: "pointer",
                                      }}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleDelete(product._id)}
                                      style={{
                                        padding: "4px 10px",
                                        backgroundColor: colors.danger + "20",
                                        color: colors.danger,
                                        border: `1px solid ${colors.danger}40`,
                                        borderRadius: "6px",
                                        fontSize: "12px",
                                        cursor: "pointer",
                                      }}
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          // Desktop Table
                          <div
                            style={{
                              backgroundColor: colors.card,
                              borderRadius: "10px",
                              border: `1px solid ${colors.border}`,
                              overflow: "hidden",
                            }}
                          >
                            <table
                              style={{
                                width: "100%",
                                borderCollapse: "collapse",
                                fontSize: "13px",
                              }}
                            >
                              <thead>
                                <tr
                                  style={{
                                    backgroundColor: colors.bg,
                                    borderBottom: `1px solid ${colors.border}`,
                                  }}
                                >
                                  {[ "Govt Code",
                                    "Brand",
                                    "Spirit Type",
                                   
                                    "Btl/Case",
                                    "Price",
                                    "Actions",
                                  ].map((h) => (
                                    <th
                                      key={h}
                                      style={{
                                        padding: "10px 14px",
                                        textAlign: "left",
                                        color: colors.textSub,
                                        fontWeight: "600",
                                        fontSize: "11px",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.4px",
                                      }}
                                    >
                                      {h}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {items.map((product, idx) => (
                                  <tr
                                    key={product._id}
                                    style={{
                                      borderBottom:
                                        idx < items.length - 1
                                          ? `1px solid ${colors.border}`
                                          : "none",
                                    }}
                                  >
                                    <td
                                      style={{
                                        padding: "12px 14px",
                                        color: colors.text,
                                        fontWeight: "500",
                                      }}
                                    >
                                      {product.name}
                                    </td>
                                    <td
                                      style={{
                                        padding: "12px 14px",
                                        color: colors.textSub,
                                      }}
                                    >
                                      {product.subCategory}
                                    </td>
                                    <td
                                      style={{
                                        padding: "12px 14px",
                                        color: colors.textSub,
                                        fontFamily: "monospace",
                                      }}
                                    >
                                      {product.govtCode || "—"}
                                    </td>
                                    <td
                                      style={{
                                        padding: "12px 14px",
                                        color: colors.textSub,
                                      }}
                                    >
                                      {product.bottlesPerCase}
                                    </td>
                                    <td
                                      style={{
                                        padding: "12px 14px",
                                        color: colors.text,
                                        fontWeight: "500",
                                      }}
                                    >
                                      ₹{product.price}
                                    </td>
                                    <td style={{ padding: "12px 14px" }}>
                                      <div
                                        style={{
                                          display: "flex",
                                          gap: "8px",
                                        }}
                                      >
                                        <button
                                          onClick={() => handleEdit(product)}
                                          style={{
                                            padding: "4px 12px",
                                            backgroundColor: colors.info + "20",
                                            color: colors.info,
                                            border: `1px solid ${colors.info}40`,
                                            borderRadius: "6px",
                                            fontSize: "12px",
                                            cursor: "pointer",
                                          }}
                                        >
                                          Edit
                                        </button>
                                        <button
                                          onClick={() =>
                                            handleDelete(product._id)
                                          }
                                          style={{
                                            padding: "4px 12px",
                                            backgroundColor:
                                              colors.danger + "20",
                                            color: colors.danger,
                                            border: `1px solid ${colors.danger}40`,
                                            borderRadius: "6px",
                                            fontSize: "12px",
                                            cursor: "pointer",
                                          }}
                                        >
                                          Remove
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              ))
          )}
        </div>
      )}

      {/* ── Tab: Add / Edit Product ── */}
      {activeTab === "add" && (
        <div
          style={{
            maxWidth: "600px",
          }}
        >
          <form onSubmit={handleSubmit}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "20px",
              }}
            >
              {/* Product Type */}
              <div>
                <label style={labelStyle}>Product Type *</label>
                <div style={{ display: "flex", gap: "10px" }}>
                  {["IMFL", "BEER"].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleTypeChange(type)}
                      style={{
                        flex: 1,
                        padding: "10px",
                        borderRadius: "8px",
                        border: `2px solid ${
                          form.productType === type
                            ? colors.accent
                            : colors.inputBorder
                        }`,
                        backgroundColor:
                          form.productType === type
                            ? colors.accent + "15"
                            : colors.input,
                        color:
                          form.productType === type
                            ? colors.accent
                            : colors.textSub,
                        fontSize: "14px",
                        fontWeight: form.productType === type ? "600" : "400",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      {type === "IMFL" ? "🍶 IMFL" : "🍺 Beer"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Brand Name */}
              <div>
                <label style={labelStyle}>Brand Name *</label>
                <input
                  style={inputStyle}
                  placeholder="e.g. Royal Stag"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              {/* Sub Category */}
              <div>
                <label style={labelStyle}>
                  {form.productType === "BEER"
                    ? "Beer Type *"
                    : "Spirit Type *"}
                </label>
                <select
                  style={inputStyle}
                  value={form.subCategory}
                  onChange={(e) =>
                    setForm({ ...form, subCategory: e.target.value })
                  }
                >
                  <option value="">Select...</option>
                  {(form.productType === "BEER" ? beerTypes : spiritTypes).map(
                    (item) => (
                      <option key={item._id} value={item.value}>
                        {item.value}
                      </option>
                    ),
                  )}
                </select>
              </div>

              {/* Price Category — IMFL only */}
              {form.productType === "IMFL" && (
                <div>
                  <label style={labelStyle}>Price Category *</label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {priceCategories.map((cat) => (
                      <button
                        key={cat._id}
                        type="button"
                        onClick={() =>
                          setForm({ ...form, priceCategory: cat.value })
                        }
                        style={{
                          flex: 1,
                          padding: "10px 8px",
                          borderRadius: "8px",
                          border: `2px solid ${
                            form.priceCategory === cat.value
                              ? colors.accent
                              : colors.inputBorder
                          }`,
                          backgroundColor:
                            form.priceCategory === cat.value
                              ? colors.accent + "15"
                              : colors.input,
                          color:
                            form.priceCategory === cat.value
                              ? colors.accent
                              : colors.textSub,
                          fontSize: "13px",
                          fontWeight:
                            form.priceCategory === cat.value ? "600" : "400",
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                      >
                        {cat.value}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Size + Bottles Per Case — side by side */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                }}
              >
                <div>
                  <label style={labelStyle}>Bottle Size *</label>
                  <select
                    style={inputStyle}
                    value={form.size}
                    onChange={(e) => handleSizeChange(e.target.value)}
                  >
                    <option value="">Select size...</option>
                    {sizes.map((s) => (
                      <option key={s._id} value={s.value}>
                        {s.value}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Bottles Per Case *</label>
                  <input
                    style={inputStyle}
                    type="number"
                    placeholder="Auto filled"
                    value={form.bottlesPerCase}
                    onChange={(e) =>
                      setForm({ ...form, bottlesPerCase: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Govt Code + Price — side by side */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                }}
              >
                <div>
                  <label style={labelStyle}>Govt Code *</label>
                  <input
                    style={inputStyle}
                    placeholder="e.g. TN1234"
                    value={form.govtCode}
                    onChange={(e) =>
                      setForm({ ...form, govtCode: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label style={labelStyle}>Price per Bottle (₹) *</label>
                  <input
                    style={inputStyle}
                    type="number"
                    placeholder="e.g. 120"
                    value={form.price}
                    onChange={(e) =>
                      setForm({ ...form, price: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Buttons */}
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  paddingTop: "8px",
                }}
              >
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    flex: 1,
                    padding: "12px",
                    backgroundColor: saving ? colors.textSub : colors.accent,
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: saving ? "not-allowed" : "pointer",
                  }}
                >
                  {saving
                    ? "Saving..."
                    : editingProduct
                      ? "Update Product"
                      : "Add Product"}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  style={{
                    padding: "12px 20px",
                    backgroundColor: "transparent",
                    color: colors.textSub,
                    border: `1px solid ${colors.border}`,
                    borderRadius: "8px",
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </PageLayout>
  );
};

export default Inventory;
