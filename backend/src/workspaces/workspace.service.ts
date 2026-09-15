import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
@Injectable() export class WorkspaceService{
 constructor(private readonly db:DatabaseService){}
 async forUser(userId:string){const r=await this.db.query<{id:string;slug:'angelbird'|'atomos';name:string;support_label:string;role:'manager'|'admin'}>(`select w.id,w.slug,w.name,w.support_label,wm.role from workspace_members wm join workspaces w on w.id=wm.workspace_id where wm.user_id=$1 and wm.is_active=true and w.is_active=true order by wm.created_at asc limit 1`,[userId]);return r.rows[0]||null;}
 async byId(id:string){const r=await this.db.query<{id:string;slug:'angelbird'|'atomos';name:string;support_label:string}>(`select id,slug,name,support_label from workspaces where id=$1 and is_active=true limit 1`,[id]);return r.rows[0]||null;}
}
