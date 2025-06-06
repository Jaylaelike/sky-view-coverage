"use client"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { TechnicalData } from "@/types/map"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"

interface TechnicalModalProps {
  data: TechnicalData | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function TechnicalModal({ data, open, onOpenChange }: TechnicalModalProps) {
  if (!data) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {data.stationNameThai} ({data.stationNameEng})
          </DialogTitle>
          <DialogDescription>ข้อมูลทางเทคนิคของสถานี</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">ผู้รับผิดชอบ</TableCell>
                <TableCell>{data.responsibleEntity}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">ที่อยู่</TableCell>
                <TableCell>{data.address}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">เจ้าของสถานที่</TableCell>
                <TableCell>{data.owner}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">ศูนย์วิศวกรรม</TableCell>
                <TableCell>{data.engineeringCenter}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">ประเภทสถานี</TableCell>
                <TableCell>{data.stationType}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">พิกัด</TableCell>
                <TableCell>
                  {data.latitude}, {data.longitude}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">ความสูง</TableCell>
                <TableCell>{data.height} เมตร</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">HRP</TableCell>
                <TableCell>{data.hrp}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">ที่ตั้งสถานี</TableCell>
                <TableCell>{data.location}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">ประเภทสายอากาศ</TableCell>
                <TableCell>
                  {data.antType1} / {data.antType2}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Beam Tilt</TableCell>
                <TableCell>{data.beamTilt || "-"}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Main Feeder Loss</TableCell>
                <TableCell>{data.feederLoss} dB</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">ยี่ห้อสายอากาศ</TableCell>
                <TableCell>{data.antBrand}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">กำลังส่งสูงสุด</TableCell>
                <TableCell>{data.maxERP} kW</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  )
}
