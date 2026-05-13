import si from 'systeminformation';

export async function getHardwareInfo() {
  try {
    const [baseboard, cpu, disk] = await Promise.all([
      si.baseboard(),
      si.cpu(),
      si.diskLayout()
    ]);

    return {
      motherboard: {
        manufacturer: baseboard.manufacturer,
        model: baseboard.model,
        serial: baseboard.serial
      },
      cpu: {
        manufacturer: cpu.manufacturer,
        brand: cpu.brand,
        speed: cpu.speed,
        cores: cpu.cores
      },
      disk: disk.map(d => ({
        device: d.device,
        type: d.type,
        name: d.name,
        serialNum: d.serialNum,
        size: d.size
      }))
    };
  } catch (error) {
    console.error('Failed to get hardware info:', error);
    return null;
  }
}
