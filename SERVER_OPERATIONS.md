# 🖥️ Dispenco — Server Operations & Dashboard Guide

This document contains everything you need to access, inspect, and manage your live Dispenco cloud infrastructure.

---

## 🌐 1. Visual Web Dashboards (Open in Browser)

You do **not** need to use the command line for day-to-day operations. You can monitor and view everything via these browser URLs:

| Tool | Web URL | What You Use It For |
| :--- | :--- | :--- |
| **Services & Logs Dashboard** *(Portainer)* | **[http://84.12.181.80:9000](http://84.12.181.80:9000)** | View all running services, live CPU & RAM meters, color-coded container logs, and 1-click **Restart** buttons (just like Railway). |
| **Database Table Viewer** *(pgweb)* | **[http://84.12.181.80:8081](http://84.12.181.80:8081)** | Browse PostgreSQL tables (`Product`, `Batch`, `Tenant`, `Subscription`, `Invoice`), inspect rows, filter records, and run SQL queries. |
| **Backend REST API** | **[http://84.12.181.80:4000/api/v1](http://84.12.181.80:4000/api/v1)** | Live backend API handling POS, Inventory, Auth, and Safepay payments. |
| **Frontend Web App** | Your Vercel URL / `https://dispenco.com` | Production Next.js 16 Web Dashboard & POS. |

> [!NOTE]
> When opening **Portainer** for the first time, it will ask you to set an admin password. Choose any secure password (12+ characters) and click **Create User**.

---

## 🔑 2. Server Access & Connection Details

* **Cloud Provider:** Oracle Cloud Always Free ($0.00/month forever)
* **Datacenter Region:** UAE East (Dubai)
* **Public IPv4 Address:** `84.12.181.80`
* **OS & Username:** Ubuntu 24.04 LTS ARM64 &rarr; `ubuntu`
* **SSH Private Key:** Located in your project root at `f:\dispenco\oracle.key`

### How to SSH into the Server from your Computer:
Open PowerShell in `f:\dispenco` and run:
```powershell
ssh -i oracle.key ubuntu@84.12.181.80
```

---

## ⚙️ 3. Environment Variables (Where they live & How to edit)

All production secrets, database credentials, and payment API keys live in:
```text
/home/ubuntu/dispenco/.env
```

### To view your environment variables:
```powershell
ssh -i oracle.key ubuntu@84.12.181.80 "cat /home/ubuntu/dispenco/.env"
```

### To update an environment variable:
1. Log in to the server:
   ```powershell
   ssh -i oracle.key ubuntu@84.12.181.80
   ```
2. Open the file in the nano editor:
   ```bash
   nano /home/ubuntu/dispenco/.env
   ```
3. Change the variable you want.
4. Press `Ctrl + O`, then hit `Enter` to save. Press `Ctrl + X` to exit.
5. Restart the API container to apply changes:
   ```bash
   cd /home/ubuntu/dispenco && sudo docker compose -f docker-compose.prod.yml restart api
   ```

---

## 🛠️ 4. Common Terminal Commands Cheat Sheet

You can run these commands from your local computer's PowerShell:

### Check Health of All Services:
```powershell
ssh -i oracle.key ubuntu@84.12.181.80 "sudo docker ps"
```

### View Live Real-Time Logs of the API:
```powershell
ssh -i oracle.key ubuntu@84.12.181.80 "cd dispenco && sudo docker compose -f docker-compose.prod.yml logs -f api"
```

### View Live Logs of the PostgreSQL Database:
```powershell
ssh -i oracle.key ubuntu@84.12.181.80 "cd dispenco && sudo docker compose -f docker-compose.prod.yml logs --tail=50 postgres"
```

### Check CPU & RAM Consumption:
```powershell
ssh -i oracle.key ubuntu@84.12.181.80 "sudo docker stats --no-stream"
```

### Deploy New Code Updates to the Server:
Whenever you push code changes to GitHub `main`, update your server with:
```powershell
ssh -i oracle.key ubuntu@84.12.181.80 "cd /home/ubuntu/dispenco && git pull origin main && sudo docker compose -f docker-compose.prod.yml up -d --build api"
```

---

## 🌐 5. Domain Configuration (`dispenco.com` from Hostinger)

To connect your newly purchased **`dispenco.com`** domain, add these records in Hostinger DNS Management:

| Type | Host / Name | Value / Points To | Target Destination |
| :--- | :--- | :--- | :--- |
| **A** | `@` | `76.76.21.21` | Vercel Frontend (`dispenco.com`) |
| **CNAME** | `www` | `cname.vercel-dns.com` | Vercel Frontend (`www.dispenco.com`) |
| **A** | `api` | `84.12.181.80` | Oracle Backend API (`api.dispenco.com`) |

---

## 🛡️ 6. Firewall & Open Ports Reference

In Oracle Cloud Console (**VCN** &rarr; **Security Lists** &rarr; **Default Security List**), the Ingress Rule allows:

* **Port `80`**: HTTP
* **Port `443`**: HTTPS
* **Port `4000`**: NestJS Core REST API
* **Port `8081`**: pgweb Database Table Viewer
* **Port `9000`**: Portainer Services & Logs Dashboard




<!-- how to deploy backend -->
ssh -i .\oracle.key -o StrictHostKeyChecking=no ubuntu@84.12.181.80 "cd /home/ubuntu/dispenco && git pull origin dev && sudo docker compose -f docker-compose.prod.yml exec -T api npx prisma db push && sudo docker compose -f docker-compose.prod.yml restart api"