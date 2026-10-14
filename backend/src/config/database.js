import { Sequelize } from "sequelize";

const sequelize =
  process.env.NODE_ENV === "test"
    ? new Sequelize({
        dialect: "sqlite",
        storage: ":memory:",
        logging: false,
      })
    : new Sequelize(
        process.env.DB_NAME,
        process.env.DB_USER,
        process.env.DB_PASSWORD,
        {
          host: process.env.DB_HOST,
          port: Number(process.env.DB_PORT) || 3306,
          dialect: "mysql",
          logging: false,
        }
      );

export default sequelize;