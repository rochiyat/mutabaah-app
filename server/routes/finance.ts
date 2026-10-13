import { Router } from 'express'
import * as financeController from '../controllers/financeController'
import { authenticate } from '../middleware/auth'

const router = Router()

router.use(authenticate)

router.get('/accounts', financeController.getAccounts)
router.post('/accounts', financeController.createAccount)
router.get('/accounts/:id', financeController.getAccount)
router.patch('/accounts/:id', financeController.updateAccount)
router.delete('/accounts/:id', financeController.deleteAccount)

// ?start=&end=&type=&category=&format=xlsx
router.get('/accounts/:id/transactions', financeController.getTransactions)
router.post('/accounts/:id/transactions', financeController.createTransaction)
router.patch('/transactions/:id', financeController.updateTransaction)
router.delete('/transactions/:id', financeController.deleteTransaction)

router.post('/accounts/:id/dues', financeController.createDuesPlan)
router.patch('/dues/:planId', financeController.updateDuesPlan)
router.delete('/dues/:planId', financeController.deleteDuesPlan)
router.get('/dues/:planId/status', financeController.getDuesStatus)
router.post('/dues/:planId/payments', financeController.payDues)
router.delete('/dues/:planId/payments', financeController.cancelDuesPayment)

export default router
