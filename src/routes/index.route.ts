import { Router } from 'express';
import IndexController from '@controllers/index.controller';
import { Routes } from '@interfaces/routes.interface';

class IndexRoute implements Routes {
  // public path = '/upload';
  public pathUrl = '/cloudSave';
  public testUrl = '/test';
  public testUpload = '/cloudTest';
  public router = Router();
  public indexController = new IndexController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // this.router.post(`${this.path}`, this.indexController.index);
    this.router.post(`${this.pathUrl}`, this.indexController.testDownload);
    this.router.post(`${this.testUrl}`, this.indexController.testAPI);
    this.router.post(`${this.testUpload}`, this.indexController.testDownload);
  }
}

export default IndexRoute;
