const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "User",
  tableName: "users",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
    },
    name: { type: "varchar" },
    email: { type: "varchar", unique: true },
    password: { type: "varchar" },
    isVerified: { type: "boolean", default: false },
    googleId: { type: "varchar", nullable: true },
    role: { type: "enum", enum: ["user", "admin"], default: "user" },
  },
});
