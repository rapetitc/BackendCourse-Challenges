import fs from "fs";
import path from "path";

import ProductsMng from "../dao/MongoDB/products.mng.js";
import ErrorHandler from "../utils/errorsHandler.js";
import ProductDTO from "../dto/product.dto.js";

const productsMng = new ProductsMng();

const removeFiles = (files) => {
  files.forEach((url) => {
    fs.rm(path.resolve("./" + url), (err) => {});
  });
};

export default class ProductsCtrlr {
  createProduct = async (req, res, next) => {
    const { title, description, code, price, stock, category } = req.body;
    const files = req.files.map((file) => `/storage/${req.pid}/${file.filename}`);
    try {
      req.user.role !== "PREMIUM" && ErrorHandler.create({ code: 1 });
      const product = await productsMng.createProduct({
        _id: req.pid,
        title,
        description,
        code,
        price: parseInt(price),
        stock: parseInt(stock),
        category,
        thumbnails: files,
        owner: req.user._id,
      });
      res.sendCreated({ message: "Product successfully created", payload: new ProductDTO(product, "response") });
    } catch (error) {
      removeFiles(files);
      next(error);
    }
  };
  getProducts = async (req, res, next) => {
    const { limit, page, sort, query } = req.query;
    try {
      const { docs, totalPages, prevPage, nextPage, hasPrevPage, hasNextPage } = await productsMng.getProducts(limit, page, sort, query);
      docs.length === 0 && ErrorHandler.create({ code: 11 });
      res.sendSuccess({
        status: "success",
        message: "Products found",
        payload: docs.map((product) => new ProductDTO(product, "response")),
        currentPage: page ? parseInt(page) : 1,
        totalPages,
        prevPage,
        nextPage,
        hasPrevPage,
        hasNextPage,
      });
    } catch (erqror) {
      next(error);
    }
  };
  getProduct = async (req, res, next) => {
    const { pid } = req.params;
    try {
      const product = await productsMng.getProduct(pid);
      const isOwner = req.user && product.owner._id.toString() === req.user._id.toString();
      res.sendSuccess({ message: "Product found", payload: new ProductDTO(product, "response"), isOwner });
    } catch (error) {
      next(error);
    }
  };
  updateProduct = async (req, res, next) => {
    const { pid } = req.params;
    const { title, description, code, price, status, stock, category } = req.body;
    const files = req.files.map((file) => `/storage/${req.pid}/${file.filename}`);
    const data = { title, description, code, price, status, stock, category, thumbnails: files.length === 0 ? undefined : files };
    try {
      const { owner } = await productsMng.getProduct(pid);
      if (owner.toString() !== req.user._id.toString() && req.user.role !== "ADMIN") ErrorHandler.create({ code: 1 });

      const product = await productsMng.updateProduct(pid, data);
      res.sendSuccess({ message: "Product was successfully updated", payload: new ProductDTO(product, "response") });
    } catch (error) {
      next(error);
    }
  };
  removeProduct = async (req, res, next) => {
    const { pid } = req.params;
    try {
      const { owner } = await productsMng.getProduct(pid);
      if (owner.toString() !== req.user._id.toString() && req.user.role !== "ADMIN") ErrorHandler.create({ code: 1 });

      await productsMng.deleteProduct(pid);
      res.sendSuccess({ message: "Product was successfully removed" });
    } catch (error) {
      next(error);
    }
  };
}
