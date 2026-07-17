"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = __importDefault(require("./routes/auth"));
const products_1 = __importDefault(require("./routes/products"));
const parties_1 = __importDefault(require("./routes/parties"));
const bills_1 = __importDefault(require("./routes/bills"));
const settings_1 = __importDefault(require("./routes/settings"));
const sms_1 = __importDefault(require("./routes/sms"));
const auth_2 = require("./middleware/auth");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/products', auth_2.authenticate, products_1.default);
app.use('/api/parties', auth_2.authenticate, parties_1.default);
app.use('/api/bills', auth_2.authenticate, bills_1.default);
app.use('/api/settings', auth_2.authenticate, settings_1.default);
app.use('/api/sms', sms_1.default);
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
