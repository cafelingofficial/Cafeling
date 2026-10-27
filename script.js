// ========================================
// CAFÉLLING CUSTOMER ORDERING SYSTEM
// Complete JavaScript + Flask Backend
// ========================================

"use strict";

const API_URL = "https://cafelling-backend.onrender.com/api";

const products = {
    "Americano": 80,
    "Spanish Latte": 90,
    "Cappuccino": 90,
    "White Chocolate Mocha": 120,
    "Ice coffee": 85,
    "Iced Matcha Latte": 95,
    "Caramel Macchiato": 110,
    "Vanilla Latte": 100,
    "Chocolate Croissant": 75,
    "Cheese Bread": 60,
    "Cinnamon Roll": 70,
    "Blueberry Muffin": 65
};

// Lahat ng Hot Coffee at Ice Drinks na pwedeng lagyan ng sugar level
const customizableProducts = [
    "Americano",
    "Spanish Latte",
    "Cappuccino",
    "White Chocolate Mocha",
    "Ice coffee",
    "Iced Matcha Latte",
    "Caramel Macchiato",
    "Vanilla Latte"
];

let cart = [];
let isSubmittingOrder = false;
let confirmedOrderNumber = "";
let confirmedCustomerName = "";
let confirmedOrderItems = [];
let confirmedOrderTotal = 0;
let confirmedPaymentMethod = "Cash";
let confirmedCustomerEmail = "";
let productAvailability = {};

try {
    productAvailability = JSON.parse(
        localStorage.getItem("cafellingProductAvailability")
    ) || {};
} catch (error) {
    productAvailability = {};
}

function formatMoney(amount) {
    return Number(amount || 0).toFixed(2);
}

function getSugarLevel() {
    const selected = document.querySelector(
        'input[name="sugarLevel"]:checked'
    );
    return selected ? selected.value : "100% Sugar";
}

function getBaseProductName(name) {
    if (Object.prototype.hasOwnProperty.call(products, name)) {
        return name;
    }
    const separatorIndex = name.indexOf(" - ");
    if (separatorIndex !== -1) {
        const baseName = name.substring(0, separatorIndex);
        if (Object.prototype.hasOwnProperty.call(products, baseName)) {
            return baseName;
        }
    }
    return name;
}

function getAvailabilityStatus(productName) {
    const product = productAvailability[productName];
    if (product === undefined || product === null || product === "") {
        return "Available";
    }
    if (typeof product === "boolean") {
        return product ? "Available" : "Unavailable";
    }
    if (typeof product === "string") {
        return product;
    }
    if (typeof product === "object") {
        if (product.available === false) {
            return "Unavailable";
        }
        return product.availability || product.status || "Available";
    }
    return "Available";
}

function isProductAvailable(productName) {
    const status = String(
        getAvailabilityStatus(productName)
    ).trim().toLowerCase();

    return ![
        "unavailable",
        "out of stock",
        "not available",
        "false"
    ].includes(status);
}

function checkProductAvailability(productName) {
    if (!isProductAvailable(productName)) {
        alert(productName + " is currently unavailable or out of stock.");
        return false;
    }
    return true;
}

function getCartQuantity() {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
}

function getCartTotal() {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

async function loadProductAvailability() {
    try {
        const response = await fetch(API_URL + "/products");
        if (!response.ok) {
            throw new Error("Could not load product availability.");
        }
        const data = await response.json();
        const productList = Array.isArray(data) ? data : data.products || [];

        productList.forEach(product => {
            if (product.name) {
                productAvailability[product.name] =
                    product.availability || product.status || "Available";
            }
        });

        try {
            localStorage.setItem(
                "cafellingProductAvailability",
                JSON.stringify(productAvailability)
            );
        } catch (storageError) {
            console.warn("Could not save availability locally.");
        }

        updateCart();
    } catch (error) {
        console.warn("Product availability refresh failed:", error.message);
    }
}

function showCategory(categoryId, button) {
    document.querySelectorAll("#menuSection .category").forEach(category => {
        category.hidden = category.id !== categoryId;
    });

    document.querySelectorAll(".category-filters button").forEach(btn => {
        btn.classList.remove("active");
    });

    if (button) {
        button.classList.add("active");
    }

    const menu = document.getElementById("menuSection");
    if (menu) {
        menu.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}

function increaseProduct(productName) {
    if (!Object.prototype.hasOwnProperty.call(products, productName)) {
        return;
    }
    if (!checkProductAvailability(productName)) {
        return;
    }

    let displayName = productName;
    if (customizableProducts.includes(productName)) {
        displayName = productName + " - " + getSugarLevel();
    }

    const existingItem = cart.find(item => item.name === displayName);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            name: displayName,
            price: products[productName],
            quantity: 1
        });
    }

    updateCart();
}

function addToCart(productName) {
    increaseProduct(productName);
}

function decreaseProduct(productName) {
    const itemIndex = cart.findIndex(
        item => getBaseProductName(item.name) === productName
    );
    if (itemIndex === -1) {
        return;
    }

    cart[itemIndex].quantity -= 1;
    if (cart[itemIndex].quantity <= 0) {
        cart.splice(itemIndex, 1);
    }

    updateCart();
}

function removeFromCart(index) {
    if (index < 0 || index >= cart.length) {
        return;
    }
    cart.splice(index, 1);
    updateCart();
}

/* UPDATE CART & FIX STATUS COLORS */
function updateCart() {
    const quantity = getCartQuantity();
    const total = getCartTotal();

    const quantityElement = document.getElementById("cartQuantity");
    const itemWordElement = document.getElementById("cartItemWord");
    const totalElement = document.getElementById("cartTotal");

    if (quantityElement) quantityElement.textContent = quantity;
    if (itemWordElement) {
        itemWordElement.textContent = quantity === 1 ? "item selected" : "items selected";
    }
    if (totalElement) totalElement.textContent = formatMoney(total);

    document.querySelectorAll("[data-product]").forEach(card => {
        const productName = card.dataset.product;
        const quantityLabel = card.querySelector('[id^="qty-"]');

        if (quantityLabel) {
            const productQuantity = cart
                .filter(item => getBaseProductName(item.name) === productName)
                .reduce((sum, item) => sum + item.quantity, 0);
            quantityLabel.textContent = productQuantity;
        }

        const stockLabel = card.querySelector("[data-stock-status]");
        const addButton = card.querySelector("[data-add-product]");
        const available = isProductAvailable(productName);
        const currentStatus = getAvailabilityStatus(productName);

        if (stockLabel) {
            stockLabel.textContent = available ? "Available" : currentStatus;

            stockLabel.className = "";
            const cleanStatus = String(currentStatus).trim().toLowerCase();

            if (cleanStatus === "unavailable") {
                stockLabel.classList.add("unavailable");
            } else if (cleanStatus === "out of stock") {
                stockLabel.classList.add("out-of-stock");
            } else {
                stockLabel.classList.add("available");
            }
        }

        if (addButton) {
            addButton.disabled = !available;
        }

        card.classList.toggle("out-of-stock", !available);
    });

    renderReviewItems();
    updateViewOrderButton();
}

function updateViewOrderButton() {
    const viewOrderButton = document.getElementById("viewOrderBtn");
    const summaryBar = document.getElementById("orderSummaryBar");
    const menuSection = document.getElementById("menuSection");
    const menuIsVisible = menuSection && !menuSection.hidden;

    if (viewOrderButton) {
        viewOrderButton.style.display = menuIsVisible && cart.length > 0 ? "" : "none";
    }
    if (summaryBar) {
        summaryBar.style.display = menuIsVisible ? "" : "none";
    }
}

function renderReviewItems() {
    const reviewItems = document.getElementById("reviewItems");
    const reviewQuantity = document.getElementById("reviewQuantity");
    const reviewTotal = document.getElementById("reviewTotal");

    if (reviewItems) {
        reviewItems.innerHTML = "";
        if (cart.length === 0) {
            reviewItems.textContent = "Your cart is empty.";
        } else {
            cart.forEach((item, index) => {
                const row = document.createElement("div");
                row.className = "review-item";

                const name = document.createElement("span");
                name.textContent = item.name + " × " + item.quantity;

                const price = document.createElement("span");
                price.textContent = "₱" + formatMoney(item.price * item.quantity);

                const removeButton = document.createElement("button");
                removeButton.type = "button";
                removeButton.textContent = "Remove";
                removeButton.addEventListener("click", () => removeFromCart(index));

                row.appendChild(name);
                row.appendChild(price);
                row.appendChild(removeButton);
                reviewItems.appendChild(row);
            });
        }
    }

    if (reviewQuantity) reviewQuantity.textContent = getCartQuantity();
    if (reviewTotal) reviewTotal.textContent = formatMoney(getCartTotal());
}

async function goToReview() {
    if (cart.length === 0) {
        alert("Please add a product to your cart first.");
        return;
    }
    await loadProductAvailability();
    for (const item of cart) {
        if (!checkProductAvailability(getBaseProductName(item.name))) {
            return;
        }
    }
    renderReviewItems();
    showSection("reviewSection");
}

function reviewOrder() {
    return goToReview();
}

function showSection(sectionId) {
    ["menuSection", "reviewSection", "detailsSection", "doneSection"].forEach(id => {
        const section = document.getElementById(id);
        if (section) section.hidden = id !== sectionId;
    });

    const stepLabels = document.querySelectorAll(".order-steps span");
    const activeStep = {
        menuSection: 0,
        reviewSection: 1,
        detailsSection: 2,
        doneSection: 3
    }[sectionId];

    stepLabels.forEach((step, index) => {
        step.classList.toggle("active", index === activeStep);
    });

    updateViewOrderButton();
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function goToMenu() {
    showSection("menuSection");
}

function goToDetails() {
    if (cart.length === 0) {
        alert("Your cart is empty.");
        return;
    }
    renderReviewItems();
    showSection("detailsSection");
}

// ========================================
// NEW: NAME + GMAIL VALIDATION
// Rule: ang Gmail ay dapat nakabase sa buong pangalan (first name + surname).
// Pangalan lang o pangalan + number lang = hindi tatanggapin.
// ========================================

const KEYBOARD_PATTERNS = [
    "qwer", "wert", "erty", "rtyu", "tyui", "yuio", "uiop",
    "asdf", "sdfg", "dfgh", "fghj", "ghjk", "hjkl",
    "zxcv", "xcvb", "cvbn", "vbnm", "qaz", "wsx"
];

// Tinatanggal ang accent (hal. ñ -> n) at nilalagay sa lowercase letters lang
function toPlainLetters(text) {
    return String(text)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z]/g, "");
}

function looksLikeRealNameWord(word) {
    const letters = toPlainLetters(word);
    if (letters.length < 2) return false;
    if (!/[aeiouy]/.test(letters)) return false;      // dapat may patinig
    if (/(.)\1\1/.test(letters)) return false;        // bawal ang aaa
    if (KEYBOARD_PATTERNS.some(p => letters.includes(p))) return false;
    return true;
}

function validateFullName(fullName) {
    const words = String(fullName).trim().split(/\s+/).filter(Boolean);

    if (words.length < 2) {
        return {
            ok: false,
            message: "Please enter your full name: first name and surname (at least 2 words)."
        };
    }

    for (const word of words) {
        if (!/^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’.-]*$/.test(word) || !looksLikeRealNameWord(word)) {
            return {
                ok: false,
                message: "Please enter a real first name and surname (letters only)."
            };
        }
    }

    return { ok: true, words: words.map(toPlainLetters) };
}

function validateGmail(email, fullName) {
    const cleanEmail = String(email).trim().toLowerCase();

    const formatMatch = cleanEmail.match(/^([a-z0-9]+(?:\.[a-z0-9]+)*)@gmail\.com$/);
    if (!formatMatch) {
        return {
            ok: false,
            message: "Please enter a valid Gmail address ending in @gmail.com (letters, numbers and dots only)."
        };
    }

    const local = formatMatch[1];
    if (local.replace(/\./g, "").length < 6) {
        return { ok: false, message: "That Gmail address is too short to be valid." };
    }

    // Hatiin: letra (may tuldok) + number sa dulo (0 hanggang 4 digit)
    const parts = local.match(/^(.*?)(\d{0,4})$/);
    const lettersWithDots = parts[1];
    const letters = lettersWithDots.replace(/\./g, "");

    if (!/^[a-z]+$/.test(letters)) {
        return {
            ok: false,
            message: "Numbers are only allowed at the end of the Gmail (up to 4 digits), like juandelacruz453@gmail.com."
        };
    }

    const nameCheck = validateFullName(fullName);
    if (!nameCheck.ok) {
        return nameCheck;
    }

    const words = nameCheck.words;
    const first = words[0];
    const surname = words.slice(1).join("");
    const lastWord = words[words.length - 1];
    const initial = first.charAt(0);

    // Pangalan lang o apelyido lang (kahit may number) = HINDI tatanggapin
    const singleNames = new Set([first, surname, lastWord, ...words]);
    if (singleNames.has(letters)) {
        return {
            ok: false,
            message: "A name only, or a name with numbers only, is not accepted. Please use a Gmail with your first name AND surname, like juandelacruz453@gmail.com."
        };
    }

    // Mga tinatanggap na structure base sa Your Name
    const allowed = new Set([
        first + surname,
        first + lastWord,
        surname + first,
        lastWord + first,
        initial + surname,
        initial + lastWord
    ]);

    if (!allowed.has(letters)) {
        return {
            ok: false,
            message: "Your Gmail must match your full name (first name and surname), like juandelacruz453@gmail.com."
        };
    }

    return { ok: true, email: cleanEmail };
}

// ========================================
// NEW: GCASH RECEIPT (pinaliit muna bago i-send)
// ========================================

function readReceiptWithFileReader(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Could not read the receipt image."));
        reader.onload = () => {
            const img = new Image();
            img.onerror = () => reject(new Error("The receipt file is not a valid image."));
            img.onload = () => {
                const maxSize = 1200;
                const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
                const width = Math.round(img.width * scale);
                const height = Math.round(img.height * scale);

                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);

                resolve(canvas.toDataURL("image/jpeg", 0.8));
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    });
}

// Pangalawang paraan ng pagbasa (object URL) kapag pumalya ang FileReader
function readReceiptWithObjectUrl(file) {
    return new Promise((resolve, reject) => {
        let objectUrl = "";
        try {
            objectUrl = URL.createObjectURL(file);
        } catch (e) {
            reject(new Error("Could not read the receipt image."));
            return;
        }

        const img = new Image();
        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("Could not read the receipt image."));
        };
        img.onload = () => {
            const maxSize = 1200;
            const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
            const width = Math.round(img.width * scale);
            const height = Math.round(img.height * scale);

            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);

            URL.revokeObjectURL(objectUrl);
            resolve(canvas.toDataURL("image/jpeg", 0.8));
        };
        img.src = objectUrl;
    });
}

async function readReceiptAsDataUrl(file) {
    try {
        return await readReceiptWithFileReader(file);
    } catch (firstError) {
        try {
            return await readReceiptWithObjectUrl(file);
        } catch (secondError) {
            throw firstError;
        }
    }
}
let receiptDataUrlPromise = null;

function setupReceiptPreloading() {
    const receiptInput = document.getElementById("gcashReceipt");
    if (!receiptInput) return;

    receiptInput.addEventListener("change", () => {
        const file = receiptInput.files && receiptInput.files[0];
        if (!file) {
            receiptDataUrlPromise = null;
            return;
        }
        const promise = readReceiptAsDataUrl(file);
        promise.catch(() => {}); // ang error ay hahawakan sa Place Order
        receiptDataUrlPromise = promise;
    });
}

function resetPaymentFields() {
    receiptDataUrlPromise = null;
    const emailInput = document.getElementById("customerEmail");
    const paymentSelect = document.getElementById("paymentMethod");
    const receiptInput = document.getElementById("gcashReceipt");

    if (emailInput) emailInput.value = "";
    if (receiptInput) receiptInput.value = "";
    if (paymentSelect) {
        paymentSelect.value = "";
        // para ma-update ang receipt box at paalala sa index.html
        paymentSelect.dispatchEvent(new Event("change"));
    }
}

async function placeOrder() {
    if (isSubmittingOrder) return;
    if (cart.length === 0) {
        alert("Your cart is empty.");
        showSection("menuSection");
        return;
    }

    const customerInput = document.getElementById("customerName");
    const tableInput = document.getElementById("tableNumber");
    const emailInput = document.getElementById("customerEmail");
    const paymentSelect = document.getElementById("paymentMethod");
    const receiptInput = document.getElementById("gcashReceipt");
    const detailsMessage = document.getElementById("detailsMessage");

    if (!customerInput || !customerInput.value.trim()) {
        alert("Please enter your name.");
        if (customerInput) customerInput.focus();
        return;
    }

    if (!tableInput || !tableInput.value.trim()) {
        alert("Please enter your table number.");
        if (tableInput) tableInput.focus();
        return;
    }

    const tableNum = parseInt(tableInput.value.trim(), 10);
    if (isNaN(tableNum) || tableNum < 1 || tableNum > 10) {
        alert("Invalid table number! Please enter a table number between 1 and 10 only.");
        if (tableInput) tableInput.focus();
        return;
    }

    // NEW: buong pangalan (first name + surname)
    const nameCheck = validateFullName(customerInput.value);
    if (!nameCheck.ok) {
        alert(nameCheck.message);
        customerInput.focus();
        return;
    }

    // NEW: Gmail
    if (!emailInput || !emailInput.value.trim()) {
        alert("Please enter your Gmail address.");
        if (emailInput) emailInput.focus();
        return;
    }

    const emailCheck = validateGmail(emailInput.value, customerInput.value);
    if (!emailCheck.ok) {
        alert(emailCheck.message);
        emailInput.focus();
        return;
    }

    // NEW: Payment method
    const paymentMethod = paymentSelect ? paymentSelect.value : "";
    if (paymentMethod !== "Cash" && paymentMethod !== "GCash") {
        alert("Please choose a payment method: Cash or GCash.");
        if (paymentSelect) paymentSelect.focus();
        return;
    }

    // NEW: GCash receipt (required kapag GCash)
    let receiptFile = null;
    if (paymentMethod === "GCash") {
        receiptFile = receiptInput && receiptInput.files ? receiptInput.files[0] : null;
        if (!receiptFile) {
            alert("Please upload your GCash receipt.");
            if (receiptInput) receiptInput.focus();
            return;
        }
        if (!receiptFile.type.startsWith("image/")) {
            alert("The GCash receipt must be an image (screenshot or photo).");
            return;
        }
        if (receiptFile.size > 10 * 1024 * 1024) {
            alert("The receipt image is too large. Please upload an image under 10 MB.");
            return;
        }
    }

    isSubmittingOrder = true;
    const placeOrderButton = Array.from(
        document.querySelectorAll("#detailsSection button")
    ).find(btn => btn.textContent.trim().toLowerCase() === "place order");

    if (placeOrderButton) {
        placeOrderButton.disabled = true;
        placeOrderButton.textContent = "Placing Order...";
    }
    if (detailsMessage) {
        detailsMessage.textContent = "Checking products and sending your order...";
    }

    try {
        await loadProductAvailability();
        for (const item of cart) {
            if (!checkProductAvailability(getBaseProductName(item.name))) {
                showSection("reviewSection");
                return;
            }
        }

        const customerName = customerInput.value.trim();
        const tableNumber = tableInput.value.trim();
        const formattedCustomerName = customerName + " (Table " + tableNumber + ")";

        const orderItems = cart.map(item => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity
        }));
        const orderTotal = getCartTotal();

        // NEW: receipt image (para sa GCash lang)
        let receiptImage = "";
        if (receiptFile) {
            try {
                if (!receiptDataUrlPromise) {
                    receiptDataUrlPromise = readReceiptAsDataUrl(receiptFile);
                }
                receiptImage = await receiptDataUrlPromise;
            } catch (receiptError) {
                receiptDataUrlPromise = null;
                throw new Error("Could not read your receipt image. Please tap Choose File and select the receipt again.");
            }
        }

        const response = await fetch(API_URL + "/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                customerName: formattedCustomerName,
                items: orderItems,
                total: orderTotal,
                // NEW FIELDS
                customerEmail: emailCheck.email,
                paymentMethod: paymentMethod,
                paymentStatus: "Pending",
                receiptImage: receiptImage
            })
        });

        let result = {};
        try {
            result = await response.json();
        } catch (e) {}

        if (!response.ok) {
            throw new Error(result.message || result.error || "The server could not save your order.");
        }

        confirmedOrderNumber = result.orderNumber ?? result.order_number ?? result.id ?? "Received";
        confirmedCustomerName = formattedCustomerName;
        confirmedOrderItems = orderItems;
        confirmedOrderTotal = orderTotal;
        confirmedPaymentMethod = paymentMethod;
        confirmedCustomerEmail = emailCheck.email;

        displayOrderConfirmation();
        cart = [];
        updateCart();
        customerInput.value = "";
        tableInput.value = "";
        resetPaymentFields();
        if (detailsMessage) detailsMessage.textContent = "";
        showSection("doneSection");
    } catch (error) {
        if (detailsMessage) {
            detailsMessage.textContent = "Unable to submit the order. Please try again.";
        }
        alert("Hindi naipasa ang order.\n\nError: " + error.message);
    } finally {
        isSubmittingOrder = false;
        if (placeOrderButton) {
            placeOrderButton.disabled = false;
            placeOrderButton.textContent = "Place Order";
        }
    }
}

function displayOrderConfirmation() {
    const orderNumber = document.getElementById("confirmedOrderNumber");
    const customer = document.getElementById("confirmedCustomerName");
    const items = document.getElementById("confirmedOrderItems");
    const total = document.getElementById("confirmedOrderTotal");
    const payNotice = document.getElementById("payNotice");

    if (orderNumber) orderNumber.textContent = "Order #" + confirmedOrderNumber;
    if (customer) customer.textContent = confirmedCustomerName;
    if (items) {
        items.innerHTML = "";
        confirmedOrderItems.forEach(item => {
            const row = document.createElement("p");
            row.textContent = item.name + " × " + item.quantity + " — ₱" + formatMoney(item.price * item.quantity);
            items.appendChild(row);
        });
    }
    if (total) total.textContent = formatMoney(confirmedOrderTotal);

    // NEW: paalala depende sa payment method
    if (payNotice) {
        if (confirmedPaymentMethod === "GCash") {
            payNotice.textContent = "Your GCash receipt was received. Staff will verify your payment, then send your confirmation email to " + confirmedCustomerEmail + ".";
        } else {
            payNotice.textContent = "Please pay the staff face-to-face. Your confirmation email will be sent to " + confirmedCustomerEmail + " once payment is received.";
        }
    }
}

function startNewOrder() {
    cart = [];
    updateCart();
    const sugarDefault = document.querySelector('input[name="sugarLevel"][value="100% Sugar"]');
    if (sugarDefault) sugarDefault.checked = true;
    const customerInput = document.getElementById("customerName");
    if (customerInput) customerInput.value = "";
    const tableInput = document.getElementById("tableNumber");
    if (tableInput) tableInput.value = "";
    resetPaymentFields();
    showSection("menuSection");
    const firstCategoryButton = document.querySelector(".category-filters button");
    showCategory("hotCoffee", firstCategoryButton);
    updateCart();
}

function clearCart() {
    if (cart.length === 0) {
        alert("Your cart is already empty.");
        return;
    }
    if (confirm("Clear all items from your cart?")) {
        cart = [];
        updateCart();
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    setupReceiptPreloading();
    showSection("menuSection");
    const firstCategoryButton = document.querySelector(".category-filters button");
    if (firstCategoryButton) {
        showCategory("hotCoffee", firstCategoryButton);
    }
    updateCart();

    await loadProductAvailability();
    setInterval(loadProductAvailability, 5000);
    updateCart();
});

