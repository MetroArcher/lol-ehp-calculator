document.getElementById("calculate").addEventListener("click", function(){

    const hp = Number(document.getElementById("hp").value)
    const armor = Number(document.getElementById("armor").value)
    const mr = Number(document.getElementById("mr").value)
    const phys = Number(document.getElementById("phys").value) / 100

    const magic = 1 - phys

    const ehp = hp * (1 + phys * armor/100 + magic * mr/100)

    document.getElementById("result").textContent =
        "Effective HP: " + ehp.toFixed(2)

})