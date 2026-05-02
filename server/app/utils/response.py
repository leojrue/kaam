def success(data=None):
    return {
        "success": True,
        "data": data if data is not None else {}
    }
