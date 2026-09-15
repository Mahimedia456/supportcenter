import { Controller, Get } from '@nestjs/common';
@Controller() export class HealthController{ @Get('health') health(){return {ok:true,service:'Support Command Center API',phase:3,timestamp:new Date().toISOString()};}}
